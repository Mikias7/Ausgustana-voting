import { describe, expect, it } from "vitest";
import { ballotSubmissionSchema, type BallotChoiceInput } from "@asa/shared";
import { validateBallot, type BallotPosition } from "../services/voting/validateBallot";
import { normalizeReceiptCode } from "../utils/receipt";

const P1 = "00000000-0000-4000-8000-000000000101";
const P2 = "00000000-0000-4000-8000-000000000102";
const C1 = "00000000-0000-4000-8000-000000000201";
const C2 = "00000000-0000-4000-8000-000000000202";
const C3 = "00000000-0000-4000-8000-000000000203";
const D1 = "00000000-0000-4000-8000-000000000301";

const president: BallotPosition = {
  id: P1,
  title: "President",
  votingMethod: "SINGLE_CHOICE",
  maxSelections: 1,
  allowAbstain: true,
  allowWriteIn: false,
  candidateIds: [C1, C2, C3],
};
const senators: BallotPosition = {
  id: P2,
  title: "Senators",
  votingMethod: "MULTIPLE_CHOICE",
  maxSelections: 2,
  allowAbstain: false,
  allowWriteIn: true,
  candidateIds: [D1],
};
const positions = [president, senators];

function run(choices: BallotChoiceInput[], eligible = [P1, P2]) {
  return validateBallot(ballotSubmissionSchema.parse({ choices }).choices, positions, eligible);
}
function messages(choices: BallotChoiceInput[], eligible?: string[]) {
  const r = run(choices, eligible);
  return r.ok ? [] : r.issues.map((i) => i.message);
}

describe("validateBallot", () => {
  it("accepts a complete ballot and produces one row per selection", () => {
    const r = run([
      { positionId: P1, candidateIds: [C2] },
      { positionId: P2, candidateIds: [D1], writeIn: "  Ada   Lovelace " },
    ]);
    expect(r).toEqual({
      ok: true,
      rows: [
        { positionId: P1, candidateId: C2, writeIn: null, abstain: false },
        { positionId: P2, candidateId: D1, writeIn: null, abstain: false },
        { positionId: P2, candidateId: null, writeIn: "Ada Lovelace", abstain: false },
      ],
    });
  });

  it("records an abstention as a single row", () => {
    const r = run([{ positionId: P1, abstain: true }], [P1]);
    expect(r).toEqual({ ok: true, rows: [{ positionId: P1, candidateId: null, writeIn: null, abstain: true }] });
  });

  it("requires every eligible position exactly once", () => {
    expect(messages([{ positionId: P1, candidateIds: [C1] }])).toEqual(["Senators is missing from your ballot"]);
    expect(
      messages([
        { positionId: P1, candidateIds: [C1] },
        { positionId: P1, candidateIds: [C2] },
        { positionId: P2, candidateIds: [D1] },
      ]),
    ).toEqual(["President appears more than once"]);
  });

  it("rejects positions the voter is not eligible for, or that don't exist", () => {
    expect(messages([{ positionId: P1, candidateIds: [C1] }, { positionId: P2, candidateIds: [D1] }], [P1])).toEqual([
      "You can't vote for this position",
    ]);
    expect(messages([{ positionId: C3, candidateIds: [] }], [])).toEqual(["You can't vote for this position"]);
  });

  it("enforces the voting method and max selections", () => {
    expect(messages([{ positionId: P1, candidateIds: [C1, C2] }], [P1])).toEqual(["Choose at most 1 for President"]);
    expect(messages([{ positionId: P2, candidateIds: [D1], writeIn: "A" }], [P2])).toEqual([]);
    const tooMany = { ...senators, maxSelections: 1 };
    const r = validateBallot(
      ballotSubmissionSchema.parse({ choices: [{ positionId: P2, candidateIds: [D1], writeIn: "A" }] }).choices,
      [tooMany],
      [P2],
    );
    expect(r.ok).toBe(false);
  });

  it("rejects candidates from another position, duplicates and empty choices", () => {
    expect(messages([{ positionId: P1, candidateIds: [D1] }], [P1])).toEqual(["Unknown candidate for President"]);
    expect(messages([{ positionId: P2, candidateIds: [D1, D1] }], [P2])).toEqual([
      "A candidate was chosen twice for Senators",
    ]);
    expect(messages([{ positionId: P1 }], [P1])).toEqual(["Choose a candidate or abstain for President"]);
    expect(messages([{ positionId: P2, writeIn: "   " }], [P2])).toEqual(["Choose a candidate for Senators"]);
  });

  it("respects abstain and write-in settings", () => {
    expect(messages([{ positionId: P2, abstain: true }], [P2])).toEqual(["Abstaining isn't allowed for Senators"]);
    expect(messages([{ positionId: P1, abstain: true, candidateIds: [C1] }], [P1])).toEqual([
      "You can't abstain and choose candidates for President",
    ]);
    expect(messages([{ positionId: P1, writeIn: "Someone" }], [P1])).toEqual(["Write-ins aren't allowed for President"]);
  });
});

describe("normalizeReceiptCode", () => {
  it("accepts lowercase, spaces and missing dashes", () => {
    expect(normalizeReceiptCode(" k7qm 3xrt-p9wd ")).toBe("K7QM-3XRT-P9WD");
    expect(normalizeReceiptCode("K7QM3XRTP9WD")).toBe("K7QM-3XRT-P9WD");
  });
  it("rejects wrong length or characters outside the alphabet", () => {
    expect(normalizeReceiptCode("K7QM-3XRT")).toBeNull();
    expect(normalizeReceiptCode("K7QM-3XRT-P9W0")).toBeNull();
  });
});
