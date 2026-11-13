import type {
  ElectionDetail,
  ElectionResults,
  ElectionSummary,
  PositionDto,
  VoteReceipt,
} from "@asa/shared";
import { api } from "./client";

/** Phase filter accepted by GET /api/elections. "past" = closed elections. */
export type ElectionListPhase = "open" | "upcoming" | "past";

export interface ElectionListFilters {
  phase?: ElectionListPhase;
  org?: string;
}

export function listElections(
  filters: ElectionListFilters = {},
  signal?: AbortSignal,
): Promise<ElectionSummary[]> {
  return api.get<ElectionSummary[]>("/elections", { phase: filters.phase, org: filters.org }, signal);
}

export function getElection(id: string, signal?: AbortSignal): Promise<ElectionDetail> {
  return api.get<ElectionDetail>(`/elections/${encodeURIComponent(id)}`, undefined, signal);
}

/**
 * Ballot for the signed-in voter (only positions they are eligible for).
 * Provisional shape — proposed for @asa/shared as `BallotDto` (feature/voting).
 */
export interface BallotDto {
  election: ElectionSummary;
  positions: PositionDto[];
}

/** Provisional submission shape — proposed for @asa/shared as a zod schema (feature/voting). */
export interface BallotSubmission {
  selections: {
    positionId: string;
    candidateIds: string[];
    writeIn?: string;
    abstain?: boolean;
  }[];
}

export function getBallot(id: string, signal?: AbortSignal): Promise<BallotDto> {
  return api.get<BallotDto>(`/elections/${encodeURIComponent(id)}/ballot`, undefined, signal);
}

export function submitVote(id: string, ballot: BallotSubmission): Promise<VoteReceipt> {
  return api.post<VoteReceipt>(`/elections/${encodeURIComponent(id)}/vote`, ballot);
}

export function getResults(id: string, signal?: AbortSignal): Promise<ElectionResults> {
  return api.get<ElectionResults>(`/elections/${encodeURIComponent(id)}/results`, undefined, signal);
}
