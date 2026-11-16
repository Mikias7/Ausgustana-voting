import { z } from "zod";
import type { VotingMethod } from "./enums";

/**
 * Positions with fewer ballots than this get a privacy warning before results
 * are released: with very few voters, totals can reveal how individuals voted.
 */
export const RESULTS_PRIVACY_MIN_BALLOTS = 5;

/** WON: elected. TIED: tied for the last seat(s), so no winner can be declared for them. */
export type CandidateOutcome = "WON" | "TIED";

export interface CandidateResult {
  /** null for write-ins. */
  candidateId: string | null;
  name: string;
  writeIn: boolean;
  votes: number;
  outcome: CandidateOutcome | null;
}

export interface PositionResult {
  positionId: string;
  title: string;
  seats: number;
  votingMethod: VotingMethod;
  /** Ballots that included this position (abstentions count). */
  totalBallots: number;
  abstentions: number;
  /** Most votes first. Write-ins are grouped by name, ignoring case and spacing. */
  candidates: CandidateResult[];
  /** True when a tie for the last seat means not every seat has a winner. */
  tie: boolean;
}

export interface ElectionResults {
  electionId: string;
  title: string;
  organizationName: string;
  /** When voting ended (early close or scheduled end). */
  closedAt: string;
  /** Whether students can see the results (per the release and visibility settings). */
  released: boolean;
  /** Set when an admin released results manually. */
  publishedAt: string | null;
  /** null when the election hides turnout. `eligible` counts students currently eligible. */
  turnout: { voted: number; eligible: number } | null;
  positions: PositionResult[];
}

export interface LowTurnoutPosition {
  positionId: string;
  title: string;
  totalBallots: number;
}

/** Positions whose totals could identify voters (see RESULTS_PRIVACY_MIN_BALLOTS). */
export function lowTurnoutPositions(positions: PositionResult[]): LowTurnoutPosition[] {
  return positions
    .filter((p) => p.totalBallots > 0 && p.totalBallots < RESULTS_PRIVACY_MIN_BALLOTS)
    .map(({ positionId, title, totalBallots }) => ({ positionId, title, totalBallots }));
}

/** POST /api/admin/elections/:id/results/publish */
export const publishResultsSchema = z.object({
  /** Required when some positions have low turnout (409 LOW_TURNOUT otherwise). */
  acknowledgeLowTurnout: z.boolean().default(false),
});
export type PublishResultsInput = z.input<typeof publishResultsSchema>;
