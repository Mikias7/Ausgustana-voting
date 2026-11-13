import { render, screen, within } from "@testing-library/react";
import type { MyElectionStatus, PositionDto } from "@asa/shared";
import { describe, expect, it } from "vitest";
import { PositionList } from "./PositionList";

function position(id: string, title: string): PositionDto {
  return {
    id,
    title,
    description: null,
    seats: 1,
    votingMethod: "SINGLE_CHOICE",
    maxSelections: 1,
    allowAbstain: true,
    allowWriteIn: false,
    eligibility: { type: "ALL_STUDENTS" },
    candidates: [],
  };
}

const POSITIONS = [position("sr", "Senior Senator"), position("fr", "Freshman Senator"), position("al", "At-Large Senator")];

const status = (overrides: Partial<MyElectionStatus> = {}): MyElectionStatus => ({
  eligible: true,
  eligiblePositionIds: ["fr", "al"],
  hasVoted: false,
  reason: null,
  ...overrides,
});

const positionTitles = (container: HTMLElement) =>
  within(container)
    .getAllByRole("heading")
    .filter((h) => h.id.startsWith("position-"))
    .map((h) => h.textContent);

describe("PositionList", () => {
  it("keeps the original order without grouping or markers when signed out", () => {
    const { container } = render(<PositionList positions={POSITIONS} myStatus={undefined} />);
    expect(positionTitles(container)).toEqual(["Senior Senator", "Freshman Senator", "At-Large Senator"]);
    expect(screen.queryByText("On your ballot")).not.toBeInTheDocument();
    expect(screen.queryByText("Other positions")).not.toBeInTheDocument();
  });

  it("groups eligible positions first, then other positions", () => {
    render(<PositionList positions={POSITIONS} myStatus={status()} />);
    const ballot = screen.getByRole("region", { name: /On your ballot/ });
    const other = screen.getByRole("region", { name: /Other positions/ });
    expect(positionTitles(ballot)).toEqual(["Freshman Senator", "At-Large Senator"]);
    expect(positionTitles(other)).toEqual(["Senior Senator"]);
    expect(within(other).getByText("Open to other classes or voter lists.")).toBeInTheDocument();
  });

  it("marks eligible positions even after the voter has voted", () => {
    render(<PositionList positions={POSITIONS} myStatus={status({ hasVoted: true })} />);
    const ballot = screen.getByRole("region", { name: /On your ballot/ });
    // One marker per eligible position (markers are <p>; the group heading is an <h3>).
    expect(within(ballot).getAllByText("On your ballot", { selector: "p" })).toHaveLength(2);
  });

  it("does not group when the voter is eligible for every position (or none)", () => {
    render(<PositionList positions={POSITIONS} myStatus={status({ eligiblePositionIds: ["sr", "fr", "al"] })} />);
    expect(screen.queryByText("Other positions")).not.toBeInTheDocument();
    expect(screen.getAllByText("On your ballot", { selector: "p" })).toHaveLength(3);
  });
});
