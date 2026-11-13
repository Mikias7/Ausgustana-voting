import type { Prisma } from "@prisma/client";
import {
  candidateInputSchema,
  positionInputSchema,
  type AdminCandidate,
  type AdminPosition,
  type CandidateInput,
  type PositionInput,
} from "@asa/shared";
import { prisma } from "../../utils/prisma";
import { AppError } from "../../utils/AppError";
import { recordAudit } from "../audit.service";
import type { AuthUser } from "../auth/currentUser";
import { assertCanManageOrg } from "./access";
import { assertStructureEditable, getManagedElection } from "./elections.service";
import {
  assertValidRules,
  jsonEqual,
  listIdsOf,
  loadLists,
  ruleJson,
  storedRule,
  toAdminCandidate,
  toAdminPosition,
} from "./rules";

const candidateOrder = [{ sortOrder: "asc" }, { name: "asc" }] satisfies Prisma.CandidateOrderByWithRelationInput[];
const positionOrder = [{ sortOrder: "asc" }, { title: "asc" }] satisfies Prisma.PositionOrderByWithRelationInput[];

/** PATCH bodies: any subset of the create fields; the merged result is re-validated with the full schema. */
export const positionUpdateSchema = positionInputSchema.innerType().partial();
export const candidateUpdateSchema = candidateInputSchema.partial();
export type PositionUpdate = Partial<PositionInput>;
export type CandidateUpdate = Partial<CandidateInput>;

async function positionDto(id: string): Promise<AdminPosition> {
  const p = await prisma.position.findUniqueOrThrow({
    where: { id },
    include: { candidates: { orderBy: candidateOrder } },
  });
  return toAdminPosition(p, await loadLists(prisma, listIdsOf([p.eligibility])));
}

/** Loads a position + its election, checking permission and that the structure may change. */
async function editablePosition(user: AuthUser, positionId: string) {
  const position = await prisma.position.findUnique({ where: { id: positionId }, include: { election: true } });
  if (!position) throw AppError.notFound("Position not found");
  assertCanManageOrg(user, position.election.organizationId);
  assertStructureEditable(position.election);
  return position;
}

async function editableCandidate(user: AuthUser, candidateId: string) {
  const candidate = await prisma.candidate.findUnique({
    where: { id: candidateId },
    include: { position: { include: { election: true } } },
  });
  if (!candidate) throw AppError.notFound("Candidate not found");
  assertCanManageOrg(user, candidate.position.election.organizationId);
  assertStructureEditable(candidate.position.election);
  return candidate;
}

/** ids must be exactly the current set (no missing, extra or duplicate ids). */
function assertSameIds(ids: string[], current: string[]): void {
  const unique = new Set(ids);
  const currentSet = new Set(current);
  if (unique.size !== ids.length || ids.length !== current.length || ids.some((id) => !currentSet.has(id))) {
    throw new AppError(400, "INVALID_ORDER", "The list of ids must contain each existing item exactly once");
  }
}

// ---------- positions ----------

export async function createPosition(user: AuthUser, electionId: string, input: PositionInput): Promise<AdminPosition> {
  const election = await getManagedElection(user, electionId);
  assertStructureEditable(election);
  await assertValidRules(prisma, election.organizationId, [input.eligibility]);

  const id = await prisma.$transaction(async (tx) => {
    const max = await tx.position.aggregate({ where: { electionId }, _max: { sortOrder: true } });
    const created = await tx.position.create({
      data: {
        electionId,
        title: input.title,
        description: input.description ?? null,
        seats: input.seats,
        votingMethod: input.votingMethod,
        maxSelections: input.maxSelections,
        allowAbstain: input.allowAbstain,
        allowWriteIn: input.allowWriteIn,
        eligibility: ruleJson(input.eligibility),
        sortOrder: (max._max.sortOrder ?? -1) + 1,
      },
    });
    await recordAudit(tx, {
      actorId: user.id,
      action: "POSITION_CREATED",
      entityType: "Position",
      entityId: created.id,
      metadata: { electionId },
    });
    return created.id;
  });
  return positionDto(id);
}

export async function updatePosition(user: AuthUser, positionId: string, patch: PositionUpdate): Promise<AdminPosition> {
  const current = await editablePosition(user, positionId);
  const before: PositionInput = {
    title: current.title,
    description: current.description,
    seats: current.seats,
    votingMethod: current.votingMethod,
    maxSelections: current.maxSelections,
    allowAbstain: current.allowAbstain,
    allowWriteIn: current.allowWriteIn,
    eligibility: storedRule(current.eligibility),
  };
  const defined = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
  const merged = positionInputSchema.parse({ ...before, ...defined }); // ZodError → 400

  const changed = (Object.keys(merged) as (keyof PositionInput)[]).filter((k) =>
    k === "eligibility" ? !jsonEqual(merged.eligibility, current.eligibility) : (merged[k] ?? null) !== (before[k] ?? null),
  );
  if (changed.length === 0) return positionDto(positionId);
  if (changed.includes("eligibility")) {
    await assertValidRules(prisma, current.election.organizationId, [merged.eligibility]);
  }

  await prisma.$transaction(async (tx) => {
    await tx.position.update({
      where: { id: positionId },
      data: {
        title: merged.title,
        description: merged.description ?? null,
        seats: merged.seats,
        votingMethod: merged.votingMethod,
        maxSelections: merged.maxSelections,
        allowAbstain: merged.allowAbstain,
        allowWriteIn: merged.allowWriteIn,
        eligibility: ruleJson(merged.eligibility),
      },
    });
    await recordAudit(tx, {
      actorId: user.id,
      action: "POSITION_UPDATED",
      entityType: "Position",
      entityId: positionId,
      metadata: { electionId: current.electionId, fields: changed },
    });
  });
  return positionDto(positionId);
}

export async function deletePosition(user: AuthUser, positionId: string): Promise<void> {
  const position = await editablePosition(user, positionId);
  await prisma.$transaction(async (tx) => {
    // Never-opened elections have no ballot selections, so candidates can go too.
    await tx.candidate.deleteMany({ where: { positionId } });
    await tx.position.delete({ where: { id: positionId } });
    await recordAudit(tx, {
      actorId: user.id,
      action: "POSITION_DELETED",
      entityType: "Position",
      entityId: positionId,
      metadata: { electionId: position.electionId },
    });
  });
}

export async function reorderPositions(user: AuthUser, electionId: string, ids: string[]): Promise<AdminPosition[]> {
  const election = await getManagedElection(user, electionId);
  assertStructureEditable(election);
  const current = await prisma.position.findMany({ where: { electionId }, select: { id: true } });
  assertSameIds(
    ids,
    current.map((p) => p.id),
  );

  await prisma.$transaction(async (tx) => {
    for (const [index, id] of ids.entries()) {
      await tx.position.update({ where: { id }, data: { sortOrder: index } });
    }
    await recordAudit(tx, {
      actorId: user.id,
      action: "POSITIONS_REORDERED",
      entityType: "Election",
      entityId: electionId,
      metadata: { count: ids.length },
    });
  });

  const positions = await prisma.position.findMany({
    where: { electionId },
    orderBy: positionOrder,
    include: { candidates: { orderBy: candidateOrder } },
  });
  const lists = await loadLists(prisma, listIdsOf(positions.map((p) => p.eligibility)));
  return positions.map((p) => toAdminPosition(p, lists));
}

// ---------- candidates ----------

export async function createCandidate(user: AuthUser, positionId: string, input: CandidateInput): Promise<AdminCandidate> {
  const position = await editablePosition(user, positionId);
  const created = await prisma.$transaction(async (tx) => {
    const max = await tx.candidate.aggregate({ where: { positionId }, _max: { sortOrder: true } });
    const c = await tx.candidate.create({
      data: {
        positionId,
        name: input.name,
        bio: input.bio ?? null,
        photoUrl: input.photoUrl ?? null,
        sortOrder: (max._max.sortOrder ?? -1) + 1,
      },
    });
    await recordAudit(tx, {
      actorId: user.id,
      action: "CANDIDATE_CREATED",
      entityType: "Candidate",
      entityId: c.id,
      metadata: { positionId, electionId: position.electionId },
    });
    return c;
  });
  return toAdminCandidate(created);
}

export async function updateCandidate(user: AuthUser, candidateId: string, patch: CandidateUpdate): Promise<AdminCandidate> {
  const current = await editableCandidate(user, candidateId);
  const changed = (Object.keys(patch) as (keyof CandidateInput)[]).filter(
    (k) => patch[k] !== undefined && (patch[k] ?? null) !== (current[k] ?? null),
  );
  if (changed.length === 0) return toAdminCandidate(current);

  const data: Prisma.CandidateUpdateInput = {};
  if (changed.includes("name")) data.name = patch.name!;
  if (changed.includes("bio")) data.bio = patch.bio ?? null;
  if (changed.includes("photoUrl")) data.photoUrl = patch.photoUrl ?? null;

  const updated = await prisma.$transaction(async (tx) => {
    const c = await tx.candidate.update({ where: { id: candidateId }, data });
    await recordAudit(tx, {
      actorId: user.id,
      action: "CANDIDATE_UPDATED",
      entityType: "Candidate",
      entityId: candidateId,
      metadata: { positionId: current.positionId, fields: changed },
    });
    return c;
  });
  return toAdminCandidate(updated);
}

export async function deleteCandidate(user: AuthUser, candidateId: string): Promise<void> {
  const candidate = await editableCandidate(user, candidateId);
  await prisma.$transaction(async (tx) => {
    await tx.candidate.delete({ where: { id: candidateId } });
    await recordAudit(tx, {
      actorId: user.id,
      action: "CANDIDATE_DELETED",
      entityType: "Candidate",
      entityId: candidateId,
      metadata: { positionId: candidate.positionId, electionId: candidate.position.electionId },
    });
  });
}

export async function reorderCandidates(user: AuthUser, positionId: string, ids: string[]): Promise<AdminCandidate[]> {
  await editablePosition(user, positionId);
  const current = await prisma.candidate.findMany({ where: { positionId }, select: { id: true } });
  assertSameIds(
    ids,
    current.map((c) => c.id),
  );

  await prisma.$transaction(async (tx) => {
    for (const [index, id] of ids.entries()) {
      await tx.candidate.update({ where: { id }, data: { sortOrder: index } });
    }
    await recordAudit(tx, {
      actorId: user.id,
      action: "CANDIDATES_REORDERED",
      entityType: "Position",
      entityId: positionId,
      metadata: { count: ids.length },
    });
  });
  const candidates = await prisma.candidate.findMany({ where: { positionId }, orderBy: candidateOrder });
  return candidates.map(toAdminCandidate);
}
