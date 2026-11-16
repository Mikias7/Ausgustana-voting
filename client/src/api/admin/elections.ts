import type {
  AdminElectionDetail,
  AdminElectionSummary,
  AdminPosition,
  AdminCandidate,
  CandidateInput,
  ElectionInput,
  ElectionResults,
  ElectionUpdate,
  ManagedOrganization,
  PositionInput,
} from "@asa/shared";
import { api } from "../client";

/** Error codes the election admin endpoints return (besides generic HTTP errors). */
export const ELECTION_ERROR_CODES = {
  locked: "ELECTION_LOCKED",
  notADraft: "NOT_A_DRAFT",
  invalidState: "INVALID_ELECTION_STATE",
  invalidOrder: "INVALID_ORDER",
  publishBlocked: "PUBLISH_BLOCKED",
  invalidVoterList: "INVALID_VOTER_LIST",
  validation: "VALIDATION_ERROR",
  lowTurnout: "LOW_TURNOUT",
  resultsAutomatic: "RESULTS_AUTOMATIC",
} as const;

const enc = encodeURIComponent;

export function listManagedOrganizations(signal?: AbortSignal): Promise<ManagedOrganization[]> {
  return api.get<ManagedOrganization[]>("/admin/organizations/managed", undefined, signal);
}

export interface AdminElectionFilters {
  /** Organization slug (403 if not managed, 404 if unknown). */
  org?: string;
  status?: string;
}

export function listAdminElections(
  filters: AdminElectionFilters = {},
  signal?: AbortSignal,
): Promise<AdminElectionSummary[]> {
  return api.get<AdminElectionSummary[]>("/admin/elections", { org: filters.org, status: filters.status }, signal);
}

export function getAdminElection(id: string, signal?: AbortSignal): Promise<AdminElectionDetail> {
  return api.get<AdminElectionDetail>(`/admin/elections/${enc(id)}`, undefined, signal);
}

export function createElection(input: ElectionInput): Promise<AdminElectionDetail> {
  return api.post<AdminElectionDetail>("/admin/elections", input);
}

export function updateElection(id: string, patch: ElectionUpdate): Promise<AdminElectionDetail> {
  return api.patch<AdminElectionDetail>(`/admin/elections/${enc(id)}`, patch);
}

/** Drafts only (409 NOT_A_DRAFT otherwise). */
export function deleteElection(id: string): Promise<void> {
  return api.delete<void>(`/admin/elections/${enc(id)}`);
}

export type ElectionLifecycleAction = "publish" | "unpublish" | "close" | "cancel";

/** POST /admin/elections/:id/{publish|unpublish|close|cancel}. Publish may fail with 400 PUBLISH_BLOCKED. */
export function runElectionAction(id: string, action: ElectionLifecycleAction): Promise<AdminElectionDetail> {
  return api.post<AdminElectionDetail>(`/admin/elections/${enc(id)}/${action}`);
}

/** Tally for a closed election (admins always see turnout). 409 while voting hasn't closed. */
export function getElectionResults(id: string, signal?: AbortSignal): Promise<ElectionResults> {
  return api.get<ElectionResults>(`/admin/elections/${enc(id)}/results`, undefined, signal);
}

/** Releases results (manual release only). 409 LOW_TURNOUT unless `acknowledgeLowTurnout`. */
export function publishResults(id: string, acknowledgeLowTurnout = false): Promise<ElectionResults> {
  return api.post<ElectionResults>(`/admin/elections/${enc(id)}/results/publish`, { acknowledgeLowTurnout });
}

/** Hides manually released results again. */
export function unpublishResults(id: string): Promise<ElectionResults> {
  return api.post<ElectionResults>(`/admin/elections/${enc(id)}/results/unpublish`);
}

/** Copies the election (positions, candidates, settings) into a new draft. */
export function duplicateElection(id: string): Promise<AdminElectionDetail> {
  return api.post<AdminElectionDetail>(`/admin/elections/${enc(id)}/duplicate`);
}

// ---------- Positions ----------

export function createPosition(electionId: string, input: PositionInput): Promise<AdminPosition> {
  return api.post<AdminPosition>(`/admin/elections/${enc(electionId)}/positions`, input);
}

export function updatePosition(positionId: string, input: Partial<PositionInput>): Promise<AdminPosition> {
  return api.patch<AdminPosition>(`/admin/positions/${enc(positionId)}`, input);
}

export function deletePosition(positionId: string): Promise<void> {
  return api.delete<void>(`/admin/positions/${enc(positionId)}`);
}

export function reorderPositions(electionId: string, ids: string[]): Promise<unknown> {
  return api.put<unknown>(`/admin/elections/${enc(electionId)}/positions/order`, { ids });
}

// ---------- Candidates ----------

export function createCandidate(positionId: string, input: CandidateInput): Promise<AdminCandidate> {
  return api.post<AdminCandidate>(`/admin/positions/${enc(positionId)}/candidates`, input);
}

export function updateCandidate(candidateId: string, input: Partial<CandidateInput>): Promise<AdminCandidate> {
  return api.patch<AdminCandidate>(`/admin/candidates/${enc(candidateId)}`, input);
}

export function deleteCandidate(candidateId: string): Promise<void> {
  return api.delete<void>(`/admin/candidates/${enc(candidateId)}`);
}

export function reorderCandidates(positionId: string, ids: string[]): Promise<unknown> {
  return api.put<unknown>(`/admin/positions/${enc(positionId)}/candidates/order`, { ids });
}
