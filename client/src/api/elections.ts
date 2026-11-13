import type {
  BallotSubmissionInput,
  ElectionDetail,
  ElectionResults,
  ElectionSummary,
  ReceiptCheck,
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

/** Casts the voter's ballot. The receipt code is returned once and never stored by the server. */
export function submitVote(id: string, ballot: BallotSubmissionInput): Promise<VoteReceipt> {
  return api.post<VoteReceipt>(`/elections/${encodeURIComponent(id)}/vote`, ballot);
}

/** Checks whether a receipt code matches a recorded ballot. */
export function checkReceipt(code: string): Promise<ReceiptCheck> {
  return api.post<ReceiptCheck>("/receipts/check", { code });
}

export function getResults(id: string, signal?: AbortSignal): Promise<ElectionResults> {
  return api.get<ElectionResults>(`/elections/${encodeURIComponent(id)}/results`, undefined, signal);
}
