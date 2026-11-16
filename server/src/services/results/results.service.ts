import type { Election } from "@prisma/client";
import {
  getElectionPhase,
  lowTurnoutPositions,
  type ElectionResults,
  type PublishResultsInput,
} from "@asa/shared";
import { prisma } from "../../utils/prisma";
import { AppError } from "../../utils/AppError";
import { recordAudit } from "../audit.service";
import type { AuthUser } from "../auth/currentUser";
import { countEligibleVoters } from "../eligibility";
import { getManagedElection } from "../admin/elections.service";
import { canViewResults } from "../results.policy";
import { tallyPositions, type TallyInput } from "./tally";

type ResultsElection = Election & { organization: { name: string } };

function notAvailable(message: string) {
  return new AppError(403, "RESULTS_NOT_AVAILABLE", message);
}

export function isReleased(e: Pick<Election, "resultsRelease" | "resultsPublishedAt">): boolean {
  return e.resultsRelease === "AUTOMATIC" || e.resultsPublishedAt !== null;
}

/** Aggregate counts for one election. Only totals leave the database, never individual ballots. */
async function loadTallyInput(electionId: string): Promise<TallyInput> {
  const inElection = { ballot: { electionId } };
  const [picks, writeIns, ballots] = await Promise.all([
    prisma.ballotSelection.groupBy({
      by: ["positionId", "candidateId", "abstain"],
      where: { ...inElection, writeIn: null },
      _count: { _all: true },
    }),
    prisma.ballotSelection.groupBy({
      by: ["positionId", "writeIn"],
      where: { ...inElection, writeIn: { not: null } },
      _count: { _all: true },
    }),
    prisma.$queryRaw<{ position_id: string; ballots: bigint }[]>`
      SELECT s.position_id, COUNT(DISTINCT s.ballot_id) AS ballots
      FROM ballot_selections s JOIN ballots b ON b.id = s.ballot_id
      WHERE b.election_id = ${electionId}::uuid
      GROUP BY s.position_id`,
  ]);

  const input: TallyInput = { candidateVotes: new Map(), abstentions: new Map(), writeIns: new Map(), ballots: new Map() };
  for (const row of picks) {
    if (row.abstain) input.abstentions.set(row.positionId, (input.abstentions.get(row.positionId) ?? 0) + row._count._all);
    else if (row.candidateId) input.candidateVotes.set(row.candidateId, row._count._all);
  }
  for (const row of writeIns) {
    const list = input.writeIns.get(row.positionId) ?? [];
    list.push({ text: row.writeIn ?? "", votes: row._count._all });
    input.writeIns.set(row.positionId, list);
  }
  for (const row of ballots) input.ballots.set(row.position_id, Number(row.ballots));
  return input;
}

async function buildResults(election: ResultsElection, withTurnout: boolean): Promise<ElectionResults> {
  const [positions, input, turnout] = await Promise.all([
    prisma.position.findMany({
      where: { electionId: election.id },
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
      include: { candidates: { orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true } } },
    }),
    loadTallyInput(election.id),
    withTurnout
      ? Promise.all([
          prisma.voterParticipation.count({ where: { electionId: election.id } }),
          countEligibleVoters(election.eligibility),
        ]).then(([voted, eligible]) => ({ voted, eligible }))
      : Promise.resolve(null),
  ]);

  return {
    electionId: election.id,
    title: election.title,
    organizationName: election.organization.name,
    closedAt: (election.closedAt ?? election.endsAt).toISOString(),
    released: isReleased(election),
    publishedAt: election.resultsPublishedAt?.toISOString() ?? null,
    turnout,
    positions: tallyPositions(positions, input),
  };
}

async function loadElection(id: string): Promise<ResultsElection> {
  const election = await prisma.election.findUnique({ where: { id }, include: { organization: { select: { name: true } } } });
  if (!election || election.status === "DRAFT") throw AppError.notFound("Election not found");
  return election;
}

/**
 * GET /api/elections/:id/results. Follows the election's release and
 * visibility settings (results.policy.ts); organization admins can preview
 * results as soon as voting closes.
 */
export async function getPublicResults(id: string, viewer: AuthUser | undefined): Promise<ElectionResults> {
  const election = await loadElection(id);
  const now = new Date();

  if (!canViewResults(election, viewer, now)) {
    const phase = getElectionPhase(election, now);
    if (phase === "cancelled") throw notAvailable("This election was cancelled, so there are no results.");
    if (phase !== "closed") throw notAvailable("Results will be available after voting closes.");
    if (!isReleased(election)) throw notAvailable("Results haven't been released yet.");
    if (election.resultsVisibility === "STUDENTS" && !viewer) throw AppError.unauthorized("Sign in to see these results");
    throw notAvailable("Results for this election are shared with its organizers only.");
  }
  return buildResults(election, election.showTurnout);
}

/** GET /api/admin/elections/:id/results. Admins always see turnout. Available once voting closes. */
export async function getAdminResults(user: AuthUser, id: string): Promise<ElectionResults> {
  const election = await getManagedElection(user, id);
  const phase = getElectionPhase(election, new Date());
  if (phase !== "closed") {
    throw new AppError(409, "INVALID_ELECTION_STATE", "Results are available once voting closes", { phase });
  }
  const organization = await prisma.organization.findUniqueOrThrow({
    where: { id: election.organizationId },
    select: { name: true },
  });
  return buildResults({ ...election, organization }, true);
}

async function setPublished(
  user: AuthUser,
  id: string,
  publish: boolean,
  acknowledgedLowTurnout: boolean,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // Lock and re-check so two admins can't publish/unpublish at once.
    await tx.$queryRaw`SELECT id FROM elections WHERE id = ${id}::uuid FOR UPDATE`;
    const fresh = await tx.election.findUniqueOrThrow({ where: { id } });
    const phase = getElectionPhase(fresh, new Date());
    if (phase !== "closed") {
      throw new AppError(409, "INVALID_ELECTION_STATE", "Results can only be released after voting closes", { phase });
    }
    if (fresh.resultsRelease === "AUTOMATIC") {
      throw new AppError(
        409,
        "RESULTS_AUTOMATIC",
        "This election releases results automatically. Switch it to manual release in Settings to control this.",
      );
    }
    if (publish && fresh.resultsPublishedAt) throw new AppError(409, "RESULTS_ALREADY_RELEASED", "Results are already released");
    if (!publish && !fresh.resultsPublishedAt) throw new AppError(409, "RESULTS_NOT_RELEASED", "Results haven't been released");

    await tx.election.update({ where: { id }, data: { resultsPublishedAt: publish ? new Date() : null } });
    await recordAudit(tx, {
      actorId: user.id,
      action: publish ? "RESULTS_PUBLISHED" : "RESULTS_UNPUBLISHED",
      entityType: "Election",
      entityId: id,
      metadata: publish ? { acknowledgedLowTurnout } : {},
    });
  });
}

/**
 * POST /api/admin/elections/:id/results/publish (manual release only).
 * Positions with very few ballots need `acknowledgeLowTurnout` (409 LOW_TURNOUT otherwise).
 */
export async function publishResults(user: AuthUser, id: string, input: PublishResultsInput): Promise<ElectionResults> {
  const results = await getAdminResults(user, id);
  const low = lowTurnoutPositions(results.positions);
  if (low.length > 0 && !input.acknowledgeLowTurnout) {
    throw new AppError(
      409,
      "LOW_TURNOUT",
      "Some positions had so few voters that the totals could reveal how individuals voted",
      { positions: low },
    );
  }
  await setPublished(user, id, true, low.length > 0);
  return getAdminResults(user, id);
}

/** POST /api/admin/elections/:id/results/unpublish: hides manually released results again. */
export async function unpublishResults(user: AuthUser, id: string): Promise<ElectionResults> {
  await getAdminResults(user, id);
  await setPublished(user, id, false, false);
  return getAdminResults(user, id);
}
