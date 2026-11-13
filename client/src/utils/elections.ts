import type { EligibilityRule, ElectionPhase, MyElectionStatus } from "@asa/shared";
import type { ElectionListPhase } from "../api/elections";

export type BadgeTone = "green" | "blue" | "slate" | "gold" | "red" | "amber" | "navy";

export interface BadgeMeta {
  label: string;
  tone: BadgeTone;
}

const PHASE_META: Record<ElectionPhase, BadgeMeta> = {
  open: { label: "Open", tone: "green" },
  upcoming: { label: "Upcoming", tone: "blue" },
  closed: { label: "Closed", tone: "slate" },
  cancelled: { label: "Cancelled", tone: "red" },
  draft: { label: "Draft", tone: "amber" },
};

export function getPhaseMeta(phase: ElectionPhase): BadgeMeta {
  return PHASE_META[phase];
}

export type EligibilityBadgeKind = "voted" | "your-class" | "eligible" | "not-eligible";

export interface EligibilityBadgeMeta extends BadgeMeta {
  kind: EligibilityBadgeKind;
}

/**
 * Voter-specific badge for an election card or header.
 * Returns null when signed out (no myStatus) or when nothing useful can be said
 * (e.g. a closed election the voter did not take part in).
 */
export function getEligibilityBadge(
  myStatus: MyElectionStatus | undefined,
  phase: ElectionPhase,
  rule?: EligibilityRule,
): EligibilityBadgeMeta | null {
  if (!myStatus) return null;
  if (myStatus.hasVoted) return { kind: "voted", label: "Voted", tone: "navy" };
  if (phase !== "open" && phase !== "upcoming") return null;
  if (!myStatus.eligible) return { kind: "not-eligible", label: "Not eligible", tone: "slate" };
  if (rule?.type === "CLASS_STANDING") return { kind: "your-class", label: "Your class", tone: "gold" };
  return { kind: "eligible", label: "Eligible", tone: "gold" };
}

/** URL tab ids on /elections and the API phase each one loads. */
export const ELECTION_TABS = [
  { id: "active", label: "Active", phase: "open" },
  { id: "upcoming", label: "Upcoming", phase: "upcoming" },
  { id: "past", label: "Past", phase: "past" },
] as const satisfies ReadonlyArray<{ id: string; label: string; phase: ElectionListPhase }>;

export type ElectionTabId = (typeof ELECTION_TABS)[number]["id"];
