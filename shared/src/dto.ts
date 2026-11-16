/**
 * Shapes of JSON returned by the REST API (see docs/ARCHITECTURE.md §7).
 * Dates are ISO-8601 strings over the wire.
 */
import type { EligibilityRule } from "./eligibility";
import type {
  ClassStanding,
  ElectionPhase,
  ElectionStatus,
  OrgRole,
  PlatformRole,
  ResultsRelease,
  ResultsVisibility,
  VotingMethod,
} from "./enums";

export interface ApiErrorBody {
  error: { code: string; message: string; details?: unknown };
}

export interface OrganizationSummary {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  contactEmail: string | null;
}

/** The signed-in user, as returned by GET /api/auth/me */
export interface CurrentUser {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  classStanding: ClassStanding | null;
  onRoster: boolean;
  platformRole: PlatformRole;
  orgRoles: { organizationId: string; organizationSlug: string; role: OrgRole }[];
}

export interface CandidateDto {
  id: string;
  name: string;
  bio: string | null;
  photoUrl: string | null;
}

export interface PositionDto {
  id: string;
  title: string;
  description: string | null;
  seats: number;
  votingMethod: VotingMethod;
  maxSelections: number;
  allowAbstain: boolean;
  allowWriteIn: boolean;
  eligibility: EligibilityRule;
  candidates: CandidateDto[];
}

/** Voter-specific status, present only when signed in. */
export interface MyElectionStatus {
  eligible: boolean;
  /** IDs of positions this voter may vote for. */
  eligiblePositionIds: string[];
  hasVoted: boolean;
  /** Human-readable reason when not eligible, e.g. "Open to Seniors only". */
  reason: string | null;
}

export interface ElectionSummary {
  id: string;
  title: string;
  description: string | null;
  organization: Pick<OrganizationSummary, "id" | "name" | "slug">;
  startsAt: string;
  endsAt: string;
  status: ElectionStatus;
  phase: ElectionPhase;
  resultsAvailable: boolean;
  myStatus?: MyElectionStatus;
}

export interface ElectionDetail extends ElectionSummary {
  eligibility: EligibilityRule;
  resultsVisibility: ResultsVisibility;
  resultsRelease: ResultsRelease;
  showTurnout: boolean;
  positions: PositionDto[];
}

export interface VoteReceipt {
  receiptCode: string;
}

export interface ParticipationEntry {
  electionId: string;
  electionTitle: string;
  organizationName: string;
  votedAt: string;
}

export interface ProfileDto extends CurrentUser {
  participations: ParticipationEntry[];
}

export interface AnnouncementDto {
  id: string;
  title: string;
  body: string;
  organizationName: string | null;
  publishedAt: string;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

/** Row in the development-only "sign in as" picker (GET /api/auth/dev/users). */
export interface DevUserOption {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  classStanding: ClassStanding | null;
  platformRole: PlatformRole;
}
