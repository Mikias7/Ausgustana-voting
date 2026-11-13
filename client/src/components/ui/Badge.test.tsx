import { render, screen } from "@testing-library/react";
import { ELECTION_PHASES, type ElectionPhase, type MyElectionStatus } from "@asa/shared";
import { describe, expect, it } from "vitest";
import { PhaseBadge } from "../elections/PhaseBadge";
import { getEligibilityBadge, getPhaseMeta } from "../../utils/elections";
import { Badge } from "./Badge";

const status = (overrides: Partial<MyElectionStatus> = {}): MyElectionStatus => ({
  eligible: true,
  eligiblePositionIds: ["p1"],
  hasVoted: false,
  reason: null,
  ...overrides,
});

describe("Badge", () => {
  it("renders its label with the requested tone", () => {
    render(<Badge tone="gold">Your class</Badge>);
    expect(screen.getByText("Your class")).toHaveAttribute("data-tone", "gold");
  });
});

describe("phase badge mapping", () => {
  it.each<[ElectionPhase, string, string]>([
    ["open", "Open", "green"],
    ["upcoming", "Upcoming", "blue"],
    ["closed", "Closed", "slate"],
    ["cancelled", "Cancelled", "red"],
    ["draft", "Draft", "amber"],
  ])("%s → %s (%s)", (phase, label, tone) => {
    expect(getPhaseMeta(phase)).toEqual({ label, tone });
    render(<PhaseBadge phase={phase} />);
    expect(screen.getByText(label)).toHaveAttribute("data-tone", tone);
  });

  it("covers every phase in the shared enum", () => {
    for (const phase of ELECTION_PHASES) expect(getPhaseMeta(phase)).toBeDefined();
  });
});

describe("eligibility badge mapping", () => {
  it("shows nothing when signed out", () => {
    expect(getEligibilityBadge(undefined, "open")).toBeNull();
  });

  it("shows Voted whenever the voter has voted, in any phase", () => {
    expect(getEligibilityBadge(status({ hasVoted: true }), "open")?.label).toBe("Voted");
    expect(getEligibilityBadge(status({ hasVoted: true }), "closed")?.label).toBe("Voted");
  });

  it("shows Your class for class-standing rules and Eligible otherwise", () => {
    expect(getEligibilityBadge(status(), "open", { type: "CLASS_STANDING", classes: ["SR"] })).toMatchObject({
      label: "Your class",
      tone: "gold",
    });
    expect(getEligibilityBadge(status(), "upcoming")).toMatchObject({ label: "Eligible", tone: "gold" });
  });

  it("shows Not eligible for open/upcoming elections only", () => {
    expect(getEligibilityBadge(status({ eligible: false }), "open")?.label).toBe("Not eligible");
    expect(getEligibilityBadge(status({ eligible: false }), "closed")).toBeNull();
  });
});
