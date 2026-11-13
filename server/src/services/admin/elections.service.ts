import type { Prisma } from "@prisma/client";
import {
  getElectionPhase,
  type AdminElectionDetail,
  type AdminElectionSummary,
  type ElectionInput,
  type ElectionPhase,
  type ElectionStatus,
  type ElectionUpdate,
  type PublishIssue,
} from "@asa/shared";
import { prisma } from "../../utils/prisma";
import { AppError } from "../../utils/AppError";
import { recordAudit, type DbClient } from "../audit.service";
import { parseStoredRule } from "../eligibility";
import type { AuthUser } from "../auth/currentUser";
import { assertCanManageOrg, resolveOrgFilter } from "./access";
import {
  assertValidRules,
  describeStoredRule,
  jsonEqual,
  listIdsOf,
  loadLists,
  ruleJson,
  storedRule,
  toAdminPosition,
  type ListInfo,
} from "./rules";

const orgSelect = { select: { id: true, name: true, slug: true } } as const;

const summaryInclude = {
  organization: orgSelect,
  positions: { select: { _count: { select: { candidates: true } } } },
  _count: { select: { participations: true } },
} satisfies Prisma.ElectionInclude;

const detailInclude = {
  organization: orgSelect,
  positions: {
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    include: { candidates: { orderBy: [{ sortOrder: "asc" }, { name: "asc" }] } },
  },
  _count: { select: { participations: true } },
} satisfies Prisma.ElectionInclude;

type SummaryRow = Prisma.ElectionGetPayload<{ include: typeof summaryInclude }>;
type DetailRow = Prisma.ElectionGetPayload<{ include: typeof detailInclude }>;

/** Fields that may still change once an election is open or closed. */
const LOCK_SAFE_FIELDS = new Set<keyof ElectionUpdate>([
  "title",
  "description",
  "resultsVisibility",
  "resultsRelease",
  "showTurnout",
]);

const DAY_MS = 24 * 60 * 60 * 1000;

// ---------- lifecycle helpers ----------

export function electionLocked(phase: ElectionPhase): boolean {
  return phase === "open" || phase === "closed";
}

interface ElectionState {
  status: ElectionStatus;
  startsAt: Date;
  endsAt: Date;
  closedAt: Date | null;
}

/** Structure (positions, candidates, rules, start) may change only for drafts and upcoming elections. */
export function assertStructureEditable(e: ElectionState, now = new Date()): void {
  const phase = getElectionPhase(e, now);
  if (phase === "cancelled") throw lockedError("This election was cancelled and can no longer be edited");
  if (electionLocked(phase)) throw lockedError("Voting has started; positions, candidates and eligibility are locked");
}

export function lockedError(message: string, details?: unknown) {
  return new AppError(409, "ELECTION_LOCKED", message, details);
}

function stateError(message: string, phase: ElectionPhase) {
  return new AppError(409, "INVALID_ELECTION_STATE", message, { phase });
}

/** Loads an election the user may manage (404 unknown, 403 other organization). */
export async function getManagedElection(user: AuthUser, id: string, db: DbClient = prisma) {
  const election = await db.election.findUnique({ where: { id } });
  if (!election) throw AppError.notFound("Election not found");
  assertCanManageOrg(user, election.organizationId);
  return election;
}

// ---------- mapping ----------

function toSummary(e: SummaryRow | DetailRow, now: Date): AdminElectionSummary {
  const candidateCount = e.positions.reduce(
    (n, p) => n + ("candidates" in p ? p.candidates.length : p._count.candidates),
    0,
  );
  return {
    id: e.id,
    title: e.title,
    organization: e.organization,
    status: e.status,
    phase: getElectionPhase(e, now),
    startsAt: e.startsAt.toISOString(),
    endsAt: e.endsAt.toISOString(),
    positionCount: e.positions.length,
    candidateCount,
    votedCount: e._count.participations,
    updatedAt: e.updatedAt.toISOString(),
  };
}

/** Problems that block publishing. Computed for every status so the editor can show them early. */
export function computePublishIssues(e: DetailRow, lists: Map<string, ListInfo>, now: Date): PublishIssue[] {
  const issues: PublishIssue[] = [];

  if (e.endsAt <= now) issues.push({ code: "ENDS_IN_PAST", message: "The end time is in the past" });
  if (e.positions.length === 0) issues.push({ code: "NO_POSITIONS", message: "Add at least one position" });

  const checkRule = (raw: unknown, where: string, positionId?: string) => {
    const rule = parseStoredRule(raw);
    const at = positionId ? { positionId } : {};
    if (!rule) {
      issues.push({ code: "INVALID_ELIGIBILITY", message: `${where}: the eligibility rule is not valid`, ...at });
      return;
    }
    if (rule.type !== "VOTER_LIST") return;
    const list = lists.get(rule.listId);
    if (!list) {
      issues.push({ code: "VOTER_LIST_MISSING", message: `${where}: the selected voter list no longer exists`, ...at });
    } else if (list.organizationId !== e.organizationId) {
      issues.push({ code: "VOTER_LIST_WRONG_ORG", message: `${where}: the voter list belongs to another organization`, ...at });
    } else if (list.memberCount === 0) {
      issues.push({ code: "VOTER_LIST_EMPTY", message: `${where}: the voter list "${list.name}" is empty`, ...at });
    }
  };

  checkRule(e.eligibility, "Election");

  for (const p of e.positions) {
    const where = `"${p.title}"`;
    const count = p.candidates.length;
    if (count === 0 && !p.allowWriteIn) {
      issues.push({ code: "POSITION_NO_CANDIDATES", message: `${where} has no candidates and write-ins are off`, positionId: p.id });
    } else if (p.votingMethod === "MULTIPLE_CHOICE" && !p.allowWriteIn && p.maxSelections > count) {
      issues.push({
        code: "MAX_SELECTIONS_EXCEEDS_CANDIDATES",
        message: `${where} allows ${p.maxSelections} selections but has only ${count} candidate${count === 1 ? "" : "s"}`,
        positionId: p.id,
      });
    }
    if (p.votingMethod === "SINGLE_CHOICE" && p.seats > 1) {
      issues.push({ code: "SINGLE_CHOICE_MULTIPLE_SEATS", message: `${where}: single choice positions can fill only one seat`, positionId: p.id });
    }
    checkRule(p.eligibility, where, p.id);
  }
  return issues;
}

async function loadDetailRow(id: string, db: DbClient = prisma): Promise<DetailRow> {
  const row = await db.election.findUnique({ where: { id }, include: detailInclude });
  if (!row) throw AppError.notFound("Election not found");
  return row;
}

async function toDetail(e: DetailRow, db: DbClient = prisma): Promise<AdminElectionDetail> {
  const now = new Date();
  const lists = await loadLists(db, listIdsOf([e.eligibility, ...e.positions.map((p) => p.eligibility)]));
  const summary = toSummary(e, now);
  return {
    ...summary,
    description: e.description,
    eligibility: storedRule(e.eligibility),
    eligibilityText: describeStoredRule(e.eligibility, lists),
    resultsVisibility: e.resultsVisibility,
    resultsRelease: e.resultsRelease,
    showTurnout: e.showTurnout,
    closedAt: e.closedAt?.toISOString() ?? null,
    resultsPublishedAt: e.resultsPublishedAt?.toISOString() ?? null,
    locked: electionLocked(summary.phase),
    publishIssues: computePublishIssues(e, lists, now),
    positions: e.positions.map((p) => toAdminPosition(p, lists)),
  };
}

// ---------- queries ----------

/**
 * Elections in the organizations the user manages.
 * Sort: drafts, upcoming and open first (startsAt ascending), then closed and
 * cancelled (endsAt descending).
 */
export async function listAdminElections(
  user: AuthUser,
  filters: { org?: string; status?: ElectionStatus },
): Promise<AdminElectionSummary[]> {
  const orgIds = await resolveOrgFilter(user, filters.org);
  const rows = await prisma.election.findMany({
    where: {
      ...(orgIds ? { organizationId: { in: orgIds } } : {}),
      ...(filters.status ? { status: filters.status } : {}),
    },
    include: summaryInclude,
  });
  const now = new Date();
  const finished = (s: AdminElectionSummary) => s.phase === "closed" || s.phase === "cancelled";
  return rows
    .map((r) => toSummary(r, now))
    .sort((a, b) => {
      const fa = finished(a);
      const fb = finished(b);
      if (fa !== fb) return fa ? 1 : -1;
      if (!fa) return a.startsAt.localeCompare(b.startsAt) || a.title.localeCompare(b.title);
      return b.endsAt.localeCompare(a.endsAt) || a.title.localeCompare(b.title);
    });
}

export async function getAdminElection(user: AuthUser, id: string): Promise<AdminElectionDetail> {
  const row = await loadDetailRow(id);
  assertCanManageOrg(user, row.organizationId);
  return toDetail(row);
}

// ---------- mutations ----------

export async function createElection(user: AuthUser, input: ElectionInput): Promise<AdminElectionDetail> {
  const org = await prisma.organization.findUnique({ where: { id: input.organizationId }, select: { id: true } });
  if (!org) throw AppError.notFound("Organization not found");
  assertCanManageOrg(user, org.id);
  await assertValidRules(prisma, org.id, [input.eligibility]);

  const id = await prisma.$transaction(async (tx) => {
    const created = await tx.election.create({
      data: {
        organizationId: org.id,
        title: input.title,
        description: input.description ?? null,
        startsAt: new Date(input.startsAt),
        endsAt: new Date(input.endsAt),
        status: "DRAFT",
        eligibility: ruleJson(input.eligibility),
        resultsVisibility: input.resultsVisibility,
        resultsRelease: input.resultsRelease,
        showTurnout: input.showTurnout,
        createdById: user.id,
      },
    });
    await recordAudit(tx, {
      actorId: user.id,
      action: "ELECTION_CREATED",
      entityType: "Election",
      entityId: created.id,
      metadata: { organizationId: org.id },
    });
    return created.id;
  });
  return toDetail(await loadDetailRow(id));
}

export async function updateElection(user: AuthUser, id: string, patch: ElectionUpdate): Promise<AdminElectionDetail> {
  const current = await getManagedElection(user, id);
  const phase = getElectionPhase(current);
  if (phase === "cancelled") throw lockedError("This election was cancelled and can no longer be edited");

  // Only fields whose value actually changes count (a form may resend unchanged values).
  const changed = (Object.keys(patch) as (keyof ElectionUpdate)[]).filter((key) => {
    const next = patch[key];
    if (next === undefined) return false;
    switch (key) {
      case "startsAt":
      case "endsAt":
        return new Date(next as string).getTime() !== current[key].getTime();
      case "eligibility":
        return !jsonEqual(next, current.eligibility);
      case "description":
        return (next ?? null) !== current.description;
      default:
        return next !== current[key];
    }
  });

  if (electionLocked(phase)) {
    const blocked = changed.filter((k) => !LOCK_SAFE_FIELDS.has(k));
    if (blocked.length > 0) {
      throw lockedError(`Voting has started; these fields can no longer change: ${blocked.join(", ")}`, { fields: blocked });
    }
  }
  if (changed.length === 0) return getAdminElection(user, id);

  const startsAt = changed.includes("startsAt") ? new Date(patch.startsAt!) : current.startsAt;
  const endsAt = changed.includes("endsAt") ? new Date(patch.endsAt!) : current.endsAt;
  if (endsAt <= startsAt) {
    throw new AppError(400, "VALIDATION_ERROR", "The request is invalid", [
      { path: "endsAt", message: "End time must be after start time" },
    ]);
  }
  if (changed.includes("eligibility")) await assertValidRules(prisma, current.organizationId, [patch.eligibility!]);

  const data: Prisma.ElectionUpdateInput = {};
  for (const key of changed) {
    if (key === "startsAt") data.startsAt = startsAt;
    else if (key === "endsAt") data.endsAt = endsAt;
    else if (key === "eligibility") data.eligibility = ruleJson(patch.eligibility!);
    else if (key === "description") data.description = patch.description ?? null;
    else Object.assign(data, { [key]: patch[key] });
  }

  await prisma.$transaction(async (tx) => {
    await tx.election.update({ where: { id }, data });
    await recordAudit(tx, {
      actorId: user.id,
      action: "ELECTION_UPDATED",
      entityType: "Election",
      entityId: id,
      metadata: { fields: changed },
    });
  });
  return getAdminElection(user, id);
}

export async function deleteElection(user: AuthUser, id: string): Promise<void> {
  const election = await getManagedElection(user, id);
  if (election.status !== "DRAFT") throw new AppError(409, "NOT_A_DRAFT", "Only draft elections can be deleted");

  await prisma.$transaction(async (tx) => {
    // Drafts have never been open, so no ballots or participation reference them.
    await tx.candidate.deleteMany({ where: { position: { electionId: id } } });
    await tx.position.deleteMany({ where: { electionId: id } });
    await tx.election.delete({ where: { id } });
    await recordAudit(tx, {
      actorId: user.id,
      action: "ELECTION_DELETED",
      entityType: "Election",
      entityId: id,
      metadata: { organizationId: election.organizationId, title: election.title },
    });
  });
}

async function transition(
  user: AuthUser,
  id: string,
  action: string,
  check: (phase: ElectionPhase) => void,
  data: (now: Date) => Prisma.ElectionUpdateInput,
  extraCheck?: (row: DetailRow, now: Date) => Promise<void>,
): Promise<AdminElectionDetail> {
  const election = await getManagedElection(user, id);
  const now = new Date();
  const phase = getElectionPhase(election, now);
  check(phase);
  if (extraCheck) await extraCheck(await loadDetailRow(id), now);

  await prisma.$transaction(async (tx) => {
    await tx.election.update({ where: { id }, data: data(now) });
    await recordAudit(tx, {
      actorId: user.id,
      action,
      entityType: "Election",
      entityId: id,
      metadata: { fromPhase: phase },
    });
  });
  return getAdminElection(user, id);
}

export function publishElection(user: AuthUser, id: string) {
  return transition(
    user,
    id,
    "ELECTION_PUBLISHED",
    (phase) => {
      if (phase !== "draft") throw new AppError(409, "NOT_A_DRAFT", "Only draft elections can be published");
    },
    () => ({ status: "PUBLISHED" }),
    async (row, now) => {
      const lists = await loadLists(prisma, listIdsOf([row.eligibility, ...row.positions.map((p) => p.eligibility)]));
      const issues = computePublishIssues(row, lists, now);
      if (issues.length > 0) {
        throw new AppError(400, "PUBLISH_BLOCKED", "Fix the listed problems before publishing", { issues });
      }
    },
  );
}

export function unpublishElection(user: AuthUser, id: string) {
  return transition(
    user,
    id,
    "ELECTION_UNPUBLISHED",
    (phase) => {
      if (phase !== "upcoming") throw stateError("Only published elections that have not opened yet can be unpublished", phase);
    },
    () => ({ status: "DRAFT" }),
  );
}

export function closeElection(user: AuthUser, id: string) {
  return transition(
    user,
    id,
    "ELECTION_CLOSED",
    (phase) => {
      if (phase !== "open") throw stateError("Only open elections can be closed", phase);
    },
    (now) => ({ closedAt: now }),
  );
}

export function cancelElection(user: AuthUser, id: string) {
  return transition(
    user,
    id,
    "ELECTION_CANCELLED",
    (phase) => {
      if (phase === "closed") throw stateError("Closed elections cannot be cancelled", phase);
      if (phase === "cancelled") throw stateError("This election is already cancelled", phase);
    },
    () => ({ status: "CANCELLED" }),
  );
}

/** Copies an election (positions, candidates, rules) into a new draft starting a week from now. */
export async function duplicateElection(user: AuthUser, id: string): Promise<AdminElectionDetail> {
  const source = await loadDetailRow(id);
  assertCanManageOrg(user, source.organizationId);

  const startsAt = new Date(Date.now() + 7 * DAY_MS);
  startsAt.setSeconds(0, 0);
  const endsAt = new Date(startsAt.getTime() + (source.endsAt.getTime() - source.startsAt.getTime()));
  const title = `Copy of ${source.title}`.slice(0, 150);

  const newId = await prisma.$transaction(async (tx) => {
    const created = await tx.election.create({
      data: {
        organizationId: source.organizationId,
        title,
        description: source.description,
        startsAt,
        endsAt,
        status: "DRAFT",
        eligibility: source.eligibility as Prisma.InputJsonValue,
        resultsVisibility: source.resultsVisibility,
        resultsRelease: source.resultsRelease,
        showTurnout: source.showTurnout,
        createdById: user.id,
      },
    });
    for (const p of source.positions) {
      await tx.position.create({
        data: {
          electionId: created.id,
          title: p.title,
          description: p.description,
          seats: p.seats,
          votingMethod: p.votingMethod,
          maxSelections: p.maxSelections,
          allowAbstain: p.allowAbstain,
          allowWriteIn: p.allowWriteIn,
          eligibility: p.eligibility as Prisma.InputJsonValue,
          sortOrder: p.sortOrder,
          candidates: {
            create: p.candidates.map((c) => ({
              name: c.name,
              bio: c.bio,
              photoUrl: c.photoUrl,
              userId: c.userId,
              sortOrder: c.sortOrder,
            })),
          },
        },
      });
    }
    await recordAudit(tx, {
      actorId: user.id,
      action: "ELECTION_DUPLICATED",
      entityType: "Election",
      entityId: created.id,
      metadata: { sourceElectionId: source.id, organizationId: source.organizationId },
    });
    return created.id;
  });
  return toDetail(await loadDetailRow(newId));
}
