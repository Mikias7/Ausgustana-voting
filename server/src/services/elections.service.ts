import type { Prisma } from "@prisma/client";
import {
  eligibilityRuleSchema,
  getElectionPhase,
  type ElectionDetail,
  type ElectionSummary,
  type MyElectionStatus,
  type PositionDto,
} from "@asa/shared";
import { prisma } from "../utils/prisma";
import { AppError } from "../utils/AppError";
import type { AuthUser } from "./auth/currentUser";
import { getMyStatuses } from "./eligibility";
import { canViewResults } from "./results.policy";

export const ELECTION_LIST_PHASES = ["open", "upcoming", "past"] as const;
export type ElectionListPhase = (typeof ELECTION_LIST_PHASES)[number];

const listInclude = {
  organization: { select: { id: true, name: true, slug: true } },
  // Positions are only needed to compute myStatus.
  positions: { select: { id: true, eligibility: true } },
} satisfies Prisma.ElectionInclude;

const detailInclude = {
  organization: { select: { id: true, name: true, slug: true } },
  positions: {
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    include: { candidates: { orderBy: [{ sortOrder: "asc" }, { name: "asc" }] } },
  },
} satisfies Prisma.ElectionInclude;

type ListElection = Prisma.ElectionGetPayload<{ include: typeof listInclude }>;
type DetailElection = Prisma.ElectionGetPayload<{ include: typeof detailInclude }>;

/** DB filter matching getElectionPhase() for published elections. */
function phaseWhere(phase: ElectionListPhase, now: Date): Prisma.ElectionWhereInput {
  switch (phase) {
    case "upcoming":
      return { startsAt: { gt: now } };
    case "open":
      return { startsAt: { lte: now }, endsAt: { gt: now }, closedAt: null };
    case "past":
      return { startsAt: { lte: now }, OR: [{ endsAt: { lte: now } }, { closedAt: { not: null } }] };
  }
}

function phaseOrder(phase: ElectionListPhase | undefined): Prisma.ElectionOrderByWithRelationInput[] {
  switch (phase) {
    case "open":
      return [{ endsAt: "asc" }];
    case "upcoming":
      return [{ startsAt: "asc" }];
    case "past":
      return [{ endsAt: "desc" }];
    default:
      return [{ startsAt: "desc" }];
  }
}

function toSummary(
  e: ListElection | DetailElection,
  viewer: AuthUser | undefined,
  myStatus: MyElectionStatus | undefined,
  now: Date,
): ElectionSummary {
  return {
    id: e.id,
    title: e.title,
    description: e.description,
    organization: e.organization,
    startsAt: e.startsAt.toISOString(),
    endsAt: e.endsAt.toISOString(),
    status: e.status,
    phase: getElectionPhase(e, now),
    resultsAvailable: canViewResults(e, viewer, now),
    ...(myStatus ? { myStatus } : {}),
  };
}

/** Published (not draft, not cancelled) elections, optionally filtered by phase and organization. */
export async function listElections(
  filters: { phase?: ElectionListPhase; org?: string },
  viewer: AuthUser | undefined,
): Promise<ElectionSummary[]> {
  const now = new Date();
  const elections = await prisma.election.findMany({
    where: {
      status: "PUBLISHED",
      ...(filters.org ? { organization: { slug: filters.org } } : {}),
      ...(filters.phase ? phaseWhere(filters.phase, now) : {}),
    },
    include: listInclude,
    orderBy: phaseOrder(filters.phase),
  });

  const statuses = viewer ? await getMyStatuses(viewer, elections) : undefined;
  return elections.map((e) => toSummary(e, viewer, statuses?.get(e.id), now));
}

function toPositionDto(p: DetailElection["positions"][number]): PositionDto {
  return {
    id: p.id,
    title: p.title,
    description: p.description,
    seats: p.seats,
    votingMethod: p.votingMethod,
    maxSelections: p.maxSelections,
    allowAbstain: p.allowAbstain,
    allowWriteIn: p.allowWriteIn,
    eligibility: eligibilityRuleSchema.parse(p.eligibility),
    candidates: p.candidates.map((c) => ({ id: c.id, name: c.name, bio: c.bio, photoUrl: c.photoUrl })),
  };
}

/** Public election detail. Drafts are invisible here (404); cancelled ones are shown as cancelled. */
export async function getElectionDetail(id: string, viewer: AuthUser | undefined): Promise<ElectionDetail> {
  const now = new Date();
  const election = await prisma.election.findUnique({ where: { id }, include: detailInclude });
  if (!election || election.status === "DRAFT") throw AppError.notFound("Election not found");

  const myStatus = viewer ? (await getMyStatuses(viewer, [election])).get(election.id) : undefined;

  return {
    ...toSummary(election, viewer, myStatus, now),
    eligibility: eligibilityRuleSchema.parse(election.eligibility),
    resultsVisibility: election.resultsVisibility,
    resultsRelease: election.resultsRelease,
    showTurnout: election.showTurnout,
    positions: election.positions.map(toPositionDto),
  };
}
