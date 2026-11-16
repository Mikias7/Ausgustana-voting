import { describe, expect, it } from "vitest";
import { lowTurnoutPositions, type CandidateResult } from "@asa/shared";
import { decideOutcomes, tallyPositions, type TallyInput, type TallyPosition } from "../services/results/tally";

const c = (name: string, votes: number): CandidateResult => ({
  candidateId: name,
  name,
  writeIn: false,
  votes,
  outcome: null,
});
const outcomes = (r: { candidates: CandidateResult[] }) => r.candidates.map((x) => `${x.name}:${x.outcome ?? "-"}`);

describe("decideOutcomes", () => {
  it("picks the top candidates for the available seats", () => {
    expect(outcomes(decideOutcomes([c("A", 5), c("B", 3), c("C", 1)], 2))).toEqual(["A:WON", "B:WON", "C:-"]);
  });

  it("marks a tie for the last seat instead of picking a winner", () => {
    const r = decideOutcomes([c("A", 5), c("B", 3), c("C", 3)], 2);
    expect(r.tie).toBe(true);
    expect(outcomes(r)).toEqual(["A:WON", "B:TIED", "C:TIED"]);
  });

  it("declares everyone with votes when they fit, and never someone with zero votes", () => {
    expect(outcomes(decideOutcomes([c("A", 2), c("B", 2), c("C", 0)], 2))).toEqual(["A:WON", "B:WON", "C:-"]);
    const none = decideOutcomes([c("A", 0), c("B", 0)], 1);
    expect(none.tie).toBe(false);
    expect(outcomes(none)).toEqual(["A:-", "B:-"]);
  });
});

describe("tallyPositions", () => {
  const president: TallyPosition = {
    id: "p1",
    title: "President",
    seats: 1,
    votingMethod: "SINGLE_CHOICE",
    candidates: [
      { id: "ann", name: "Ann" },
      { id: "ben", name: "Ben" },
    ],
  };

  it("adds abstentions, groups write-ins by name and sorts by votes", () => {
    const input: TallyInput = {
      candidateVotes: new Map([
        ["ann", 2],
        ["ben", 4],
      ]),
      abstentions: new Map([["p1", 1]]),
      writeIns: new Map([
        [
          "p1",
          [
            { text: "ada lovelace", votes: 1 },
            { text: "Ada  Lovelace", votes: 2 },
          ],
        ],
      ]),
      ballots: new Map([["p1", 10]]),
    };
    const [r] = tallyPositions([president], input);
    expect(r).toMatchObject({ totalBallots: 10, abstentions: 1, tie: false });
    expect(r!.candidates).toEqual([
      { candidateId: "ben", name: "Ben", writeIn: false, votes: 4, outcome: "WON" },
      { candidateId: null, name: "Ada Lovelace", writeIn: true, votes: 3, outcome: null },
      { candidateId: "ann", name: "Ann", writeIn: false, votes: 2, outcome: null },
    ]);
  });

  it("handles a position nobody voted on, and flags low turnout", () => {
    const empty: TallyInput = { candidateVotes: new Map(), abstentions: new Map(), writeIns: new Map(), ballots: new Map() };
    const [r] = tallyPositions([president], empty);
    expect(r).toMatchObject({ totalBallots: 0, abstentions: 0, tie: false });
    expect(lowTurnoutPositions([r!])).toEqual([]);
    expect(lowTurnoutPositions([{ ...r!, totalBallots: 3 }])).toEqual([{ positionId: "p1", title: "President", totalBallots: 3 }]);
  });
});
