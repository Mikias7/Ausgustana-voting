import type { ElectionPhase, ElectionStatus } from "./enums";

interface PhaseInput {
  status: ElectionStatus;
  startsAt: Date | string;
  endsAt: Date | string;
  closedAt?: Date | string | null;
}

/**
 * Single source of truth for an election's lifecycle phase.
 * The phase is derived from stored status + dates and is never persisted.
 */
export function getElectionPhase(election: PhaseInput, now: Date = new Date()): ElectionPhase {
  if (election.status === "DRAFT") return "draft";
  if (election.status === "CANCELLED") return "cancelled";

  const startsAt = new Date(election.startsAt);
  const endsAt = new Date(election.endsAt);
  if (now < startsAt) return "upcoming";
  if (election.closedAt || now >= endsAt) return "closed";
  return "open";
}
