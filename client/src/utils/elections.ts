import type { ElectionPhase, ElectionSummary, MyElectionStatus } from "@asa/shared";
import type { ElectionListPhase } from "../api/elections";

/** Dot color for a status indicator (docs/DESIGN.md §5). */
export type StatusTone = "success" | "upcoming" | "muted" | "danger" | "warning";

export interface PhaseMeta {
  label: string;
  tone: StatusTone;
}

const PHASE_META: Record<ElectionPhase, PhaseMeta> = {
  open: { label: "Open", tone: "success" },
  upcoming: { label: "Upcoming", tone: "upcoming" },
  closed: { label: "Closed", tone: "muted" },
  cancelled: { label: "Cancelled", tone: "danger" },
  draft: { label: "Draft", tone: "warning" },
};

export function getPhaseMeta(phase: ElectionPhase): PhaseMeta {
  return PHASE_META[phase];
}

export type EligibilityKind = "voted" | "eligible" | "not-eligible";

export interface EligibilityMeta {
  kind: EligibilityKind;
  label: string;
}

/**
 * Voter-specific chip for an election row or header.
 * Returns null when signed out (no myStatus) or when nothing useful can be said
 * (e.g. a closed election the voter did not take part in).
 */
export function getEligibility(myStatus: MyElectionStatus | undefined, phase: ElectionPhase): EligibilityMeta | null {
  if (!myStatus) return null;
  if (myStatus.hasVoted) return { kind: "voted", label: "Voted" };
  if (phase !== "open" && phase !== "upcoming") return null;
  if (!myStatus.eligible) return { kind: "not-eligible", label: "Not eligible" };
  return { kind: "eligible", label: "You can vote" };
}

/** Slug of the student government; its elections are featured when nothing is personal to the viewer. */
export const ASA_ORG_SLUG = "asa";

const bySoonestClosing = (a: ElectionSummary, b: ElectionSummary) => Date.parse(a.endsAt) - Date.parse(b.endsAt);

/**
 * The open election to feature on Home, by priority:
 * (a) one the viewer can still vote in (eligible, not voted), soonest closing;
 * (b) otherwise an ASA election, soonest closing;
 * (c) otherwise the soonest closing election.
 */
export function pickFeaturedElection(elections: ElectionSummary[] | undefined): ElectionSummary | undefined {
  if (!elections?.length) return undefined;
  const sorted = [...elections].sort(bySoonestClosing);
  return (
    sorted.find((e) => e.myStatus?.eligible && !e.myStatus.hasVoted) ??
    sorted.find((e) => e.organization.slug === ASA_ORG_SLUG) ??
    sorted[0]
  );
}

/** URL tab ids on /elections and the API phase each one loads. */
export const ELECTION_TABS = [
  { id: "active", label: "Active", phase: "open" },
  { id: "upcoming", label: "Upcoming", phase: "upcoming" },
  { id: "past", label: "Past", phase: "past" },
] as const satisfies ReadonlyArray<{ id: string; label: string; phase: ElectionListPhase }>;

export type ElectionTabId = (typeof ELECTION_TABS)[number]["id"];
