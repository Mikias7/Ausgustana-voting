import { describe, expect, it } from "vitest";
import type { PositionDto } from "@asa/shared";
import {
  canAddMore,
  choiceProblem,
  describeChoice,
  emptyChoice,
  setAbstain,
  setWriteIn,
  toSubmission,
  toggleCandidate,
} from "./ballot";

function position(overrides: Partial<PositionDto> = {}): PositionDto {
  return {
    id: "p1",
    title: "President",
    description: null,
    seats: 1,
    votingMethod: "SINGLE_CHOICE",
    maxSelections: 1,
    allowAbstain: true,
    allowWriteIn: true,
    eligibility: { type: "ALL_STUDENTS" },
    candidates: [
      { id: "a", name: "Ann", bio: null, photoUrl: null },
      { id: "b", name: "Ben", bio: null, photoUrl: null },
      { id: "c", name: "Cal", bio: null, photoUrl: null },
    ],
    ...overrides,
  };
}
const multi = position({ votingMethod: "MULTIPLE_CHOICE", maxSelections: 2, allowAbstain: false });

describe("ballot draft helpers", () => {
  it("single choice acts like radio buttons and a write-in replaces the pick", () => {
    const p = position();
    let c = toggleCandidate(p, emptyChoice, "a");
    c = toggleCandidate(p, c, "b");
    expect(c.candidateIds).toEqual(["b"]);
    c = setWriteIn(p, c, "Dana");
    expect(c).toEqual({ candidateIds: [], writeIn: "Dana", abstain: false });
    c = toggleCandidate(p, c, "a");
    expect(c).toEqual({ candidateIds: ["a"], writeIn: "", abstain: false });
    expect(toggleCandidate(p, c, "a").candidateIds).toEqual([]);
  });

  it("multiple choice stops at the limit, counting a write-in", () => {
    let c = toggleCandidate(multi, emptyChoice, "a");
    c = setWriteIn(multi, c, "Dana");
    expect(canAddMore(multi, c)).toBe(false);
    expect(toggleCandidate(multi, c, "b")).toBe(c);
    expect(choiceProblem(multi, c)).toBeNull();
  });

  it("abstaining clears picks, and picking clears abstain", () => {
    const p = position();
    let c = setAbstain(toggleCandidate(p, emptyChoice, "a"), true);
    expect(c).toEqual({ candidateIds: [], writeIn: "", abstain: true });
    c = toggleCandidate(p, c, "b");
    expect(c.abstain).toBe(false);
  });

  it("reports what is missing", () => {
    expect(choiceProblem(position(), undefined)).toBe("Choose a candidate or abstain");
    expect(choiceProblem(multi, undefined)).toBe("Choose a candidate");
    expect(choiceProblem(multi, { ...emptyChoice, abstain: true })).toBe("Abstaining isn't allowed for this position");
    expect(choiceProblem(position(), { ...emptyChoice, writeIn: "   " })).toBe("Choose a candidate or abstain");
  });

  it("builds the submission and the review summary", () => {
    const p = position();
    const draft = { p1: { candidateIds: [], writeIn: " Dana ", abstain: false }, p2: { ...emptyChoice, abstain: true } };
    expect(toSubmission([p, position({ id: "p2" })], draft)).toEqual({
      choices: [
        { positionId: "p1", candidateIds: [], writeIn: "Dana", abstain: false },
        { positionId: "p2", candidateIds: [], abstain: true },
      ],
    });
    expect(describeChoice(multi, { candidateIds: ["b", "a"], writeIn: "", abstain: false })).toEqual(["Ben", "Ann"]);
    expect(describeChoice(p, draft.p1)).toEqual(["Dana (write-in)"]);
  });
});
