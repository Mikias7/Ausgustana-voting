import { render, screen } from "@testing-library/react";
import { ELECTION_PHASES, type ElectionPhase, type MyElectionStatus } from "@asa/shared";
import { describe, expect, it } from "vitest";
import { EligibilityChip } from "../elections/EligibilityChip";
import { getEligibility, getPhaseMeta } from "../../utils/elections";
import { StatusIndicator } from "./StatusIndicator";

const status = (overrides: Partial<MyElectionStatus> = {}): MyElectionStatus => ({
  eligible: true,
  eligiblePositionIds: ["p1"],
  hasVoted: false,
  reason: null,
  ...overrides,
});

describe("StatusIndicator", () => {
  it.each<[ElectionPhase, string, string]>([
    ["open", "Open", "success"],
    ["upcoming", "Upcoming", "upcoming"],
    ["closed", "Closed", "muted"],
    ["cancelled", "Cancelled", "danger"],
    ["draft", "Draft", "warning"],
  ])("%s → text label %s with a %s dot", (phase, label, tone) => {
    expect(getPhaseMeta(phase)).toEqual({ label, tone });
    render(<StatusIndicator phase={phase} />);
    // Status is conveyed by text, not only by the (aria-hidden) dot.
    const indicator = screen.getByText(label);
    expect(indicator).toHaveAttribute("data-status", tone);
    expect(indicator).toHaveTextContent(new RegExp(`^${label}$`));
  });

  it("covers every phase in the shared enum", () => {
    for (const phase of ELECTION_PHASES) expect(getPhaseMeta(phase).label).toBeTruthy();
  });

  it("accepts a custom tone and label", () => {
    render(<StatusIndicator tone="success" label="On current roster" />);
    expect(screen.getByText("On current roster")).toHaveAttribute("data-status", "success");
  });
});

describe("eligibility mapping", () => {
  it("shows nothing when signed out", () => {
    expect(getEligibility(undefined, "open")).toBeNull();
    const { container } = render(<EligibilityChip myStatus={undefined} phase="open" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows Voted whenever the voter has voted, in any phase", () => {
    expect(getEligibility(status({ hasVoted: true }), "open")?.label).toBe("Voted");
    expect(getEligibility(status({ hasVoted: true }), "closed")?.label).toBe("Voted");
  });

  it("shows You can vote for eligible voters in open or upcoming elections", () => {
    expect(getEligibility(status(), "open")).toEqual({ kind: "eligible", label: "You can vote" });
    expect(getEligibility(status(), "upcoming")?.label).toBe("You can vote");
    render(<EligibilityChip myStatus={status()} phase="open" />);
    expect(screen.getByText("You can vote")).toHaveAttribute("data-eligibility", "eligible");
  });

  it("shows Not eligible for open/upcoming elections only", () => {
    expect(getEligibility(status({ eligible: false }), "open")?.label).toBe("Not eligible");
    expect(getEligibility(status({ eligible: false }), "closed")).toBeNull();
  });
});
