import { describe, expect, it } from "vitest";
import type { AdminElectionSummary } from "@asa/shared";
import { ApiError } from "../api/client";
import {
  canAddClassSenators,
  classSenatorInputs,
  dashboardElectionCounts,
  describeAdminError,
  matchesPhaseFilter,
  moveId,
  parseUsernames,
} from "./adminElections";
import { fieldErrorsFromApiError } from "./formErrors";

describe("admin election utils", () => {
  it("filters phases, with cancelled under Closed", () => {
    expect(matchesPhaseFilter("cancelled", "closed")).toBe(true);
    expect(matchesPhaseFilter("draft", "open")).toBe(false);
    expect(matchesPhaseFilter("upcoming", "all")).toBe(true);
  });

  it("summarises counts for the dashboard", () => {
    const e = (phase: AdminElectionSummary["phase"]) => ({ phase }) as AdminElectionSummary;
    expect(dashboardElectionCounts([e("open"), e("open"), e("draft")])).toBe("2 open · 1 draft");
    expect(dashboardElectionCounts([e("closed")])).toBe("1 election");
    expect(dashboardElectionCounts([])).toBeNull();
  });

  it("builds the class senator template in order", () => {
    const inputs = classSenatorInputs();
    expect(inputs.map((i) => i.title)).toEqual([
      "Freshman Senator",
      "Sophomore Senator",
      "Junior Senator",
      "Senior Senator",
    ]);
    expect(inputs[2]).toMatchObject({
      votingMethod: "SINGLE_CHOICE",
      seats: 1,
      maxSelections: 1,
      eligibility: { type: "CLASS_STANDING", classes: ["JR"] },
    });
    expect(canAddClassSenators([{ title: "President" }])).toBe(true);
    expect(canAddClassSenators([{ title: "junior senator" }])).toBe(false);
  });

  it("moves ids up and down within bounds", () => {
    expect(moveId(["a", "b", "c"], 1, -1)).toEqual(["b", "a", "c"]);
    expect(moveId(["a", "b", "c"], 2, 1)).toBeNull();
  });

  it("parses usernames from lines, commas and emails", () => {
    expect(parseUsernames(" JDoe\nasmith, bking@ole.augie.edu;jdoe\n\n")).toEqual(["jdoe", "asmith", "bking"]);
  });

  it("maps API errors to friendly copy and field errors", () => {
    expect(describeAdminError(new ApiError(409, "ELECTION_LOCKED", "x")).title).toBe("Voting has started");
    expect(describeAdminError(new ApiError(500, "HTTP_ERROR", "Boom")).message).toBe("Boom");
    const fields = fieldErrorsFromApiError(
      new ApiError(400, "VALIDATION_ERROR", "Invalid", [
        { path: "endsAt", message: "End time must be after start time" },
        { path: ["body", "title"], message: "Too short" },
      ]),
    );
    expect(fields).toEqual({ endsAt: "End time must be after start time", title: "Too short" });
  });
});
