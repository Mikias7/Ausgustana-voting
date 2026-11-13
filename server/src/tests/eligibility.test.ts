import { describe, expect, it } from "vitest";
import type { EligibilityRule } from "@asa/shared";
import { describeRule, isEligible, parseStoredRule, type VoterFacts } from "../services/eligibility/isEligible";
import { computeMyStatus } from "../services/eligibility/myStatus";

const LIST_ID = "6f1c2b9e-1d2a-4c3b-9e8f-0a1b2c3d4e5f";
const OTHER_LIST_ID = "0e9d8c7b-6a5f-4e3d-8c2b-1a0f9e8d7c6b";

const voter = (overrides: Partial<VoterFacts> = {}): VoterFacts => ({
  onRoster: true,
  classStanding: "SR",
  username: "sr.student1",
  ...overrides,
});
const noLists = { voterListIds: new Set<string>() };
const inList = { voterListIds: new Set([LIST_ID]) };

const ALL: EligibilityRule = { type: "ALL_STUDENTS" };
const SENIORS: EligibilityRule = { type: "CLASS_STANDING", classes: ["SR"] };
const LIST: EligibilityRule = { type: "VOTER_LIST", listId: LIST_ID };

describe("isEligible", () => {
  it("ALL_STUDENTS admits any rostered student, with or without a class", () => {
    expect(isEligible(voter(), ALL, noLists)).toBe(true);
    expect(isEligible(voter({ classStanding: null }), ALL, noLists)).toBe(true);
  });

  it("CLASS_STANDING admits only the listed classes", () => {
    expect(isEligible(voter({ classStanding: "SR" }), SENIORS, noLists)).toBe(true);
    expect(isEligible(voter({ classStanding: "JR" }), SENIORS, noLists)).toBe(false);
    expect(isEligible(voter({ classStanding: "JR" }), { type: "CLASS_STANDING", classes: ["JR", "SR"] }, noLists)).toBe(true);
  });

  it("CLASS_STANDING never admits a student without a class", () => {
    const everyone: EligibilityRule = { type: "CLASS_STANDING", classes: ["FR", "SO", "JR", "SR"] };
    expect(isEligible(voter({ classStanding: null }), everyone, noLists)).toBe(false);
  });

  it("VOTER_LIST admits only members of that list", () => {
    expect(isEligible(voter(), LIST, inList)).toBe(true);
    expect(isEligible(voter(), LIST, noLists)).toBe(false);
    expect(isEligible(voter(), LIST, { voterListIds: new Set([OTHER_LIST_ID]) })).toBe(false);
  });

  it("never admits a student who is not on the roster", () => {
    const off = voter({ onRoster: false });
    expect(isEligible(off, ALL, inList)).toBe(false);
    expect(isEligible(off, SENIORS, inList)).toBe(false);
    expect(isEligible(off, LIST, inList)).toBe(false);
  });

  it("fails closed on an unknown rule type", () => {
    expect(isEligible(voter(), { type: "EVERYONE" } as unknown as EligibilityRule, noLists)).toBe(false);
  });
});

describe("parseStoredRule", () => {
  it("accepts valid rules and rejects malformed JSON", () => {
    expect(parseStoredRule({ type: "ALL_STUDENTS" })).toEqual(ALL);
    expect(parseStoredRule({ type: "CLASS_STANDING", classes: [] })).toBeNull();
    expect(parseStoredRule({ type: "CLASS_STANDING", classes: ["XX"] })).toBeNull();
    expect(parseStoredRule({ type: "VOTER_LIST", listId: "nope" })).toBeNull();
    expect(parseStoredRule(null)).toBeNull();
  });
});

describe("describeRule", () => {
  it.each<[EligibilityRule, string]>([
    [ALL, "Open to all students"],
    [SENIORS, "Open to Seniors only"],
    [{ type: "CLASS_STANDING", classes: ["FR"] }, "Open to Freshmen only"],
    [{ type: "CLASS_STANDING", classes: ["SR", "JR"] }, "Open to Juniors and Seniors"],
    [{ type: "CLASS_STANDING", classes: ["JR", "FR", "SO"] }, "Open to Freshmen, Sophomores and Juniors"],
    [{ type: "CLASS_STANDING", classes: ["FR", "SO", "JR", "SR"] }, "Open to undergraduates"],
    [{ type: "CLASS_STANDING", classes: ["FR", "SO", "JR", "SR", "GR"] }, "Open to all class years"],
    [{ type: "CLASS_STANDING", classes: ["GR"] }, "Open to Graduate students only"],
    [LIST, "Open to a specific list of students"],
  ])("%j → %s", (rule, text) => {
    expect(describeRule(rule)).toBe(text);
  });

  it("names the voter list when given", () => {
    expect(describeRule(LIST, "International Students")).toBe('Open to students on the "International Students" list');
  });
});

describe("computeMyStatus", () => {
  const senate = {
    eligibility: ALL,
    positions: [
      { id: "fr", eligibility: { type: "CLASS_STANDING", classes: ["FR"] } },
      { id: "sr", eligibility: SENIORS },
      { id: "at-large", eligibility: ALL },
      { id: "intl", eligibility: LIST },
    ],
  };

  it("lists only the positions the voter may vote for", () => {
    expect(computeMyStatus(senate, voter(), noLists, false)).toEqual({
      eligible: true,
      eligiblePositionIds: ["sr", "at-large"],
      hasVoted: false,
      reason: null,
    });
    expect(computeMyStatus(senate, voter({ classStanding: "FR" }), inList, true).eligiblePositionIds).toEqual([
      "fr",
      "at-large",
      "intl",
    ]);
  });

  it("reports hasVoted independently of eligibility", () => {
    expect(computeMyStatus(senate, voter(), noLists, true).hasVoted).toBe(true);
    expect(computeMyStatus(senate, voter({ onRoster: false }), noLists, true)).toMatchObject({ eligible: false, hasVoted: true });
  });

  it("requires the election rule as well as the position rule", () => {
    const seniorsOnly = { ...senate, eligibility: SENIORS };
    expect(computeMyStatus(seniorsOnly, voter({ classStanding: "JR" }), noLists, false)).toEqual({
      eligible: false,
      eligiblePositionIds: [],
      hasVoted: false,
      reason: "Open to Seniors only",
    });
  });

  it("explains roster status first", () => {
    expect(computeMyStatus(senate, voter({ onRoster: false }), noLists, false).reason).toMatch(/not on the current student roster/);
  });

  it("uses the single position's rule as the reason", () => {
    const one = { eligibility: ALL, positions: [{ id: "p", eligibility: SENIORS }] };
    expect(computeMyStatus(one, voter({ classStanding: "SO" }), noLists, false).reason).toBe("Open to Seniors only");
  });

  it("gives a generic reason when no position of several is open to the voter", () => {
    const two = { eligibility: ALL, positions: [{ id: "a", eligibility: SENIORS }, { id: "b", eligibility: LIST }] };
    expect(computeMyStatus(two, voter({ classStanding: "SO" }), noLists, false).reason).toMatch(/not eligible for any position/);
  });

  it("fails closed on a malformed stored rule", () => {
    const broken = { eligibility: { type: "???" }, positions: [{ id: "a", eligibility: ALL }] };
    expect(computeMyStatus(broken, voter(), noLists, false).eligible).toBe(false);
    const brokenPosition = { eligibility: ALL, positions: [{ id: "a", eligibility: { nope: true } }, { id: "b", eligibility: ALL }] };
    expect(computeMyStatus(brokenPosition, voter(), noLists, false).eligiblePositionIds).toEqual(["b"]);
  });
});
