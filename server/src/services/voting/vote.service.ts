import { Prisma } from "@prisma/client";
import { getElectionPhase, type BallotSubmission, type ReceiptCheck, type VoteReceipt } from "@asa/shared";
import { prisma } from "../../utils/prisma";
import { AppError } from "../../utils/AppError";
import { recordAudit } from "../audit.service";
import type { AuthUser } from "../auth/currentUser";
import { computeMyStatus, parseStoredRule } from "../eligibility";
import { generateReceiptCode, hashReceiptCode, normalizeReceiptCode } from "../../utils/receipt";
import { validateBallot } from "./validateBallot";

const alreadyVoted = () => new AppError(409, "ALREADY_VOTED", "You have already voted in this election");

/**
 * Casts a ballot (docs/ARCHITECTURE.md §4.4). Everything is re-checked inside
 * one transaction. The participation row (who voted) and the ballot (what was
 * chosen) share no key and the ballot has no timestamp, so the application
 * cannot link them. Returns the receipt code, which is never stored.
 */
export async function castVote(user: AuthUser, electionId: string, submission: BallotSubmission): Promise<VoteReceipt> {
  const receiptCode = generateReceiptCode();

  try {
    await prisma.$transaction(async (tx) => {
      // Row lock: an admin closing/cancelling the election waits for this vote (and vice versa),
      // so a ballot can't land after the close is committed.
      const locked = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM elections WHERE id = ${electionId}::uuid FOR SHARE`;
      if (locked.length === 0) throw AppError.notFound("Election not found");

      const [election, voter, alreadyParticipated] = await Promise.all([
        tx.election.findUniqueOrThrow({
          where: { id: electionId },
          include: {
            positions: {
              include: { candidates: { select: { id: true } } },
            },
          },
        }),
        // Fresh read: roster status may have changed since the session was loaded.
        tx.user.findUniqueOrThrow({
          where: { id: user.id },
          select: { id: true, username: true, onRoster: true, classStanding: true },
        }),
        tx.voterParticipation.findUnique({
          where: { electionId_userId: { electionId, userId: user.id } },
          select: { id: true },
        }),
      ]);

      if (election.status === "DRAFT") throw AppError.notFound("Election not found");
      if (getElectionPhase(election, new Date()) !== "open") {
        throw new AppError(409, "ELECTION_NOT_OPEN", "Voting is not open for this election");
      }
      if (alreadyParticipated) throw alreadyVoted();

      const listIds = new Set<string>();
      for (const raw of [election.eligibility, ...election.positions.map((p) => p.eligibility)]) {
        const rule = parseStoredRule(raw);
        if (rule?.type === "VOTER_LIST") listIds.add(rule.listId);
      }
      const memberships = listIds.size
        ? await tx.voterListMember.findMany({
            where: { username: voter.username, voterListId: { in: [...listIds] } },
            select: { voterListId: true },
          })
        : [];

      const status = computeMyStatus(
        election,
        voter,
        { voterListIds: new Set(memberships.map((m) => m.voterListId)) },
        false,
      );
      if (!status.eligible) {
        throw new AppError(403, "NOT_ELIGIBLE", status.reason ?? "You are not eligible to vote in this election");
      }

      const result = validateBallot(
        submission.choices,
        election.positions.map((p) => ({
          id: p.id,
          title: p.title,
          votingMethod: p.votingMethod,
          maxSelections: p.maxSelections,
          allowAbstain: p.allowAbstain,
          allowWriteIn: p.allowWriteIn,
          candidateIds: p.candidates.map((c) => c.id),
        })),
        status.eligiblePositionIds,
      );
      if (!result.ok) {
        throw new AppError(400, "INVALID_BALLOT", "Your ballot has problems. Please review it and try again.", {
          issues: result.issues,
        });
      }

      // UNIQUE(election_id, user_id) is the real double-vote guard, including concurrent requests.
      await tx.voterParticipation.create({ data: { electionId, userId: voter.id } });
      await tx.ballot.create({
        data: {
          electionId,
          receiptHash: hashReceiptCode(receiptCode),
          selections: { createMany: { data: result.rows } },
        },
      });
      // That they voted, never what.
      await recordAudit(tx, { actorId: voter.id, action: "VOTE_CAST", entityType: "Election", entityId: electionId });
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") throw alreadyVoted();
    if (err instanceof AppError) throw err;
    // Never pass the raw error on: database errors can quote the ballot's values,
    // and the error handler logs 5xx errors next to request metadata.
    const kind = err instanceof Prisma.PrismaClientKnownRequestError ? err.code : (err as Error)?.name;
    console.error(`castVote failed (${kind ?? "unknown"})`);
    throw new AppError(500, "VOTE_FAILED", "We couldn't record your ballot. Nothing was saved; please try again.");
  }

  return { receiptCode };
}

/** Confirms a receipt code matches a recorded ballot. Reveals only the election, never the choices. */
export async function checkReceipt(input: string): Promise<ReceiptCheck> {
  const code = normalizeReceiptCode(input);
  if (!code) return { recorded: false, election: null };

  const ballot = await prisma.ballot.findUnique({
    where: { receiptHash: hashReceiptCode(code) },
    select: { election: { select: { id: true, title: true } } },
  });
  return ballot ? { recorded: true, election: ballot.election } : { recorded: false, election: null };
}
