import { describe, expect, it } from "vitest";
import type { PositionResult } from "@asa/shared";
import { percent, positionMeta, winners } from "./results";

const p: PositionResult = {
  positionId: "p",
  title: "Senators",
  seats: 2,
  votingMethod: "MULTIPLE_CHOICE",
  totalBallots: 1,
  abstentions: 0,
  tie: false,
  candidates: [
    { candidateId: "a", name: "Ann", writeIn: false, votes: 1, outcome: "WON" },
    { candidateId: "b", name: "Ben", writeIn: false, votes: 0, outcome: null },
  ],
};

describe("results helpers", () => {
  it("rounds percentages and never divides by zero", () => {
    expect(percent(1, 3)).toBe(33);
    expect(percent(2, 3)).toBe(67);
    expect(percent(5, 0)).toBe(0);
    expect(percent(12, 10)).toBe(100);
  });

  it("describes a position and its winners", () => {
    expect(positionMeta(p)).toBe("2 seats · 1 ballot");
    expect(positionMeta({ ...p, seats: 1, totalBallots: 9, abstentions: 2 })).toBe("1 seat · 9 ballots · 2 abstained");
    expect(winners(p)).toEqual(["Ann"]);
  });
});
