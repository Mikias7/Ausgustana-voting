import type { ElectionResults, PositionResult } from "@asa/shared";

/** Whole-number percentage, 0 when there's nothing to divide by. Never above 100. */
export function percent(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.min(100, Math.round((part / whole) * 100));
}

/** "1 seat · 12 ballots · 2 abstained" */
export function positionMeta(p: PositionResult): string {
  const parts = [
    `${p.seats} ${p.seats === 1 ? "seat" : "seats"}`,
    `${p.totalBallots} ${p.totalBallots === 1 ? "ballot" : "ballots"}`,
  ];
  if (p.abstentions > 0) parts.push(`${p.abstentions} abstained`);
  return parts.join(" · ");
}

/** Names of elected candidates, e.g. for a screen-reader summary. */
export function winners(p: PositionResult): string[] {
  return p.candidates.filter((c) => c.outcome === "WON").map((c) => c.name);
}

export function turnoutPercent(turnout: NonNullable<ElectionResults["turnout"]>): number {
  return percent(turnout.voted, turnout.eligible);
}
