/**
 * Admin election management contract (docs/ARCHITECTURE.md §4, §7).
 * Zod schemas validate request bodies on the server and forms on the client.
 *
 * Permissions: platform admins manage every organization; ORG_ADMIN / ELECTION_ADMIN
 * manage only their organization's elections and voter lists.
 *
 * Locking: once an election is OPEN (published and start time reached), its positions,
 * candidates, eligibility rules and start time can no longer change (409 ELECTION_LOCKED).
 * It can only be closed early. Drafts may be deleted; published elections may be cancelled.
 */
import { z } from "zod";
import { eligibilityRuleSchema, type EligibilityRule } from "./eligibility";
import {
  RESULTS_RELEASES,
  RESULTS_VISIBILITIES,
  VOTING_METHODS,
  type ElectionPhase,
  type ElectionStatus,
  type ResultsRelease,
  type ResultsVisibility,
  type VotingMethod,
} from "./enums";

const isoDate = z.string().datetime({ offset: true });
const optionalText = (max: number) => z.string().trim().max(max).nullable().optional();

// ---------- Request bodies ----------

export const electionInputSchema = z
  .object({
    organizationId: z.string().uuid(),
    title: z.string().trim().min(3).max(150),
    description: optionalText(4000),
    startsAt: isoDate,
    endsAt: isoDate,
    eligibility: eligibilityRuleSchema,
    resultsVisibility: z.enum(RESULTS_VISIBILITIES),
    resultsRelease: z.enum(RESULTS_RELEASES),
    showTurnout: z.boolean(),
  })
  .refine((v) => new Date(v.endsAt) > new Date(v.startsAt), {
    message: "End time must be after start time",
    path: ["endsAt"],
  });
export type ElectionInput = z.infer<typeof electionInputSchema>;

/** PATCH body: any subset of fields except organizationId. */
export const electionUpdateSchema = z
  .object({
    title: z.string().trim().min(3).max(150),
    description: optionalText(4000),
    startsAt: isoDate,
    endsAt: isoDate,
    eligibility: eligibilityRuleSchema,
    resultsVisibility: z.enum(RESULTS_VISIBILITIES),
    resultsRelease: z.enum(RESULTS_RELEASES),
    showTurnout: z.boolean(),
  })
  .partial();
export type ElectionUpdate = z.infer<typeof electionUpdateSchema>;

export const positionInputSchema = z
  .object({
    title: z.string().trim().min(2).max(120),
    description: optionalText(2000),
    seats: z.number().int().min(1).max(20),
    votingMethod: z.enum(VOTING_METHODS),
    maxSelections: z.number().int().min(1).max(20),
    allowAbstain: z.boolean(),
    allowWriteIn: z.boolean(),
    eligibility: eligibilityRuleSchema,
  })
  .refine((v) => v.votingMethod !== "SINGLE_CHOICE" || v.maxSelections === 1, {
    message: "Single choice positions allow exactly one selection",
    path: ["maxSelections"],
  });
export type PositionInput = z.infer<typeof positionInputSchema>;

export const candidateInputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  bio: optionalText(1000),
  photoUrl: z.string().trim().url().max(500).nullable().optional(),
});
export type CandidateInput = z.infer<typeof candidateInputSchema>;

/** PUT body for reordering positions or candidates: full list of ids in the new order. */
export const reorderSchema = z.object({ ids: z.array(z.string().uuid()).min(1) });

export const voterListInputSchema = z.object({
  organizationId: z.string().uuid(),
  name: z.string().trim().min(2).max(120),
});

/** PUT /api/admin/voter-lists/:id/members — replaces the member list. */
export const voterListMembersSchema = z.object({
  usernames: z.array(z.string().trim().toLowerCase().min(1).max(64)).max(10000),
});

// ---------- Responses ----------

export interface ManagedOrganization {
  id: string;
  name: string;
  slug: string;
  /** null for platform admins acting on any organization. */
  role: "ORG_ADMIN" | "ELECTION_ADMIN" | null;
}

export interface AdminCandidate {
  id: string;
  name: string;
  bio: string | null;
  photoUrl: string | null;
  sortOrder: number;
}

export interface AdminPosition {
  id: string;
  title: string;
  description: string | null;
  seats: number;
  votingMethod: VotingMethod;
  maxSelections: number;
  allowAbstain: boolean;
  allowWriteIn: boolean;
  eligibility: EligibilityRule;
  /** Human-readable eligibility, e.g. "Open to Freshmen only". */
  eligibilityText: string;
  sortOrder: number;
  candidates: AdminCandidate[];
}

/** Problems that block publishing (empty when ready). */
export interface PublishIssue {
  code: string;
  message: string;
  positionId?: string;
}

export interface AdminElectionSummary {
  id: string;
  title: string;
  organization: { id: string; name: string; slug: string };
  status: ElectionStatus;
  phase: ElectionPhase;
  startsAt: string;
  endsAt: string;
  positionCount: number;
  candidateCount: number;
  /** Number of students who have voted (never who voted for whom). */
  votedCount: number;
  updatedAt: string;
}

export interface AdminElectionDetail extends AdminElectionSummary {
  description: string | null;
  eligibility: EligibilityRule;
  eligibilityText: string;
  resultsVisibility: ResultsVisibility;
  resultsRelease: ResultsRelease;
  showTurnout: boolean;
  closedAt: string | null;
  resultsPublishedAt: string | null;
  /** True once open: structure (positions, candidates, rules, start) can't change. */
  locked: boolean;
  publishIssues: PublishIssue[];
  positions: AdminPosition[];
}

export interface VoterListSummary {
  id: string;
  name: string;
  organization: { id: string; name: string; slug: string };
  memberCount: number;
  /** Usernames not found on the roster (still kept; they may be imported later). */
  unknownCount: number;
}

export interface VoterListDetail extends VoterListSummary {
  members: { username: string; name: string | null; onRoster: boolean }[];
}
