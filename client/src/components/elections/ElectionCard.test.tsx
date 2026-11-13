import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ElectionSummary, MyElectionStatus } from "@asa/shared";
import { describe, expect, it } from "vitest";
import { ElectionCard } from "./ElectionCard";

function makeElection(overrides: Partial<ElectionSummary> = {}): ElectionSummary {
  return {
    id: "e1",
    title: "ASA Senate Fall 2026",
    description: "Elect your class senators and at-large senators for the 2026–27 academic year.",
    organization: { id: "o1", name: "Augustana Student Association", slug: "asa" },
    startsAt: "2026-11-10T14:00:00.000Z",
    endsAt: "2026-11-20T23:00:00.000Z",
    status: "PUBLISHED",
    phase: "open",
    resultsAvailable: false,
    ...overrides,
  };
}

const myStatus = (overrides: Partial<MyElectionStatus> = {}): MyElectionStatus => ({
  eligible: true,
  eligiblePositionIds: ["p1"],
  hasVoted: false,
  reason: null,
  ...overrides,
});

function renderCard(election: ElectionSummary) {
  return render(
    <MemoryRouter>
      <ElectionCard election={election} />
    </MemoryRouter>,
  );
}

describe("ElectionCard", () => {
  it("shows title link, organization, description and phase", () => {
    renderCard(makeElection());
    expect(screen.getByRole("link", { name: "ASA Senate Fall 2026" })).toHaveAttribute("href", "/elections/e1");
    expect(screen.getByText("Augustana Student Association")).toBeInTheDocument();
    expect(screen.getByText(/Elect your class senators/)).toBeInTheDocument();
    expect(screen.getByText("Open")).toBeInTheDocument();
    expect(screen.getByText(/Closes/)).toBeInTheDocument();
  });

  it("shows no eligibility badge when signed out", () => {
    renderCard(makeElection());
    expect(screen.queryByText("Eligible")).not.toBeInTheDocument();
    expect(screen.queryByText("Not eligible")).not.toBeInTheDocument();
    expect(screen.queryByText("Voted")).not.toBeInTheDocument();
  });

  it("shows Eligible for an eligible voter", () => {
    renderCard(makeElection({ myStatus: myStatus() }));
    expect(screen.getByText("Eligible")).toBeInTheDocument();
  });

  it("shows Not eligible for an ineligible voter", () => {
    renderCard(makeElection({ myStatus: myStatus({ eligible: false, eligiblePositionIds: [], reason: "Open to Seniors only" }) }));
    expect(screen.getByText("Not eligible")).toBeInTheDocument();
  });

  it("shows Voted after the voter has voted", () => {
    renderCard(makeElection({ myStatus: myStatus({ hasVoted: true }) }));
    expect(screen.getByText("Voted")).toBeInTheDocument();
    expect(screen.queryByText("Eligible")).not.toBeInTheDocument();
  });

  it("uses opening time for upcoming elections and offers results for closed ones", () => {
    const { unmount } = renderCard(makeElection({ phase: "upcoming" }));
    expect(screen.getByText(/Opens/)).toBeInTheDocument();
    expect(screen.getByText("Upcoming")).toBeInTheDocument();
    unmount();

    renderCard(makeElection({ phase: "closed", resultsAvailable: true }));
    expect(screen.getByText("Closed", { selector: "[data-tone]" })).toBeInTheDocument();
    expect(screen.getByText("Results")).toBeInTheDocument();
  });
});
