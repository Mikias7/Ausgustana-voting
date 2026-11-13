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
    endsAt: "2099-11-20T23:00:00.000Z",
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

function renderCard(election: ElectionSummary, variant?: "row" | "feature") {
  return render(
    <MemoryRouter>
      <ul>
        <ElectionCard election={election} variant={variant} />
      </ul>
    </MemoryRouter>,
  );
}

describe("ElectionCard (row)", () => {
  it("renders a list row whose title links to the election", () => {
    renderCard(makeElection());
    expect(screen.getByRole("listitem")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "ASA Senate Fall 2026" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "ASA Senate Fall 2026" })).toHaveAttribute("href", "/elections/e1");
  });

  it("shows organization, timing and a text status", () => {
    renderCard(makeElection());
    expect(screen.getByText(/Augustana Student Association/)).toBeInTheDocument();
    expect(screen.getByText(/Closes/)).toBeInTheDocument();
    expect(screen.getByText("Open")).toHaveAttribute("data-status", "success");
  });

  it("shows no eligibility chip when signed out", () => {
    renderCard(makeElection());
    expect(screen.queryByText("You can vote")).not.toBeInTheDocument();
    expect(screen.queryByText("Not eligible")).not.toBeInTheDocument();
    expect(screen.queryByText("Voted")).not.toBeInTheDocument();
  });

  it("shows You can vote for an eligible voter", () => {
    renderCard(makeElection({ myStatus: myStatus() }));
    expect(screen.getByText("You can vote")).toBeInTheDocument();
  });

  it("shows Not eligible for an ineligible voter", () => {
    renderCard(makeElection({ myStatus: myStatus({ eligible: false, eligiblePositionIds: [], reason: "Open to Seniors only" }) }));
    expect(screen.getByText("Not eligible")).toBeInTheDocument();
  });

  it("shows Voted after the voter has voted", () => {
    renderCard(makeElection({ myStatus: myStatus({ hasVoted: true }) }));
    expect(screen.getByText("Voted")).toBeInTheDocument();
    expect(screen.queryByText("You can vote")).not.toBeInTheDocument();
  });

  it("uses opening time for upcoming elections and offers results for closed ones", () => {
    const { unmount } = renderCard(makeElection({ phase: "upcoming" }));
    expect(screen.getByText(/Opens/)).toBeInTheDocument();
    expect(screen.getByText("Upcoming")).toBeInTheDocument();
    unmount();

    renderCard(makeElection({ phase: "closed", resultsAvailable: true }));
    expect(screen.getByText("Closed", { selector: "[data-status]" })).toBeInTheDocument();
    expect(screen.getByText("Results")).toBeInTheDocument();
  });
});

describe("ElectionCard (feature)", () => {
  it("shows description, a countdown and a call to action", () => {
    renderCard(makeElection(), "feature");
    expect(screen.getByRole("heading", { name: "ASA Senate Fall 2026" })).toBeInTheDocument();
    expect(screen.getByText(/Elect your class senators/)).toBeInTheDocument();
    expect(screen.getByText("Closes in")).toBeInTheDocument();
    expect(screen.getByText(/^\d+ days$/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View ASA Senate Fall 2026" })).toHaveAttribute("href", "/elections/e1");
  });

  it("offers a gold Vote now action when the viewer can vote", () => {
    renderCard(makeElection({ myStatus: myStatus() }), "feature");
    const cta = screen.getByRole("link", { name: "Vote now in ASA Senate Fall 2026" });
    expect(cta).toHaveAttribute("href", "/elections/e1/vote");
    expect(cta.className).toContain("bg-gold");
  });

  it("falls back to View election after the viewer has voted", () => {
    renderCard(makeElection({ myStatus: myStatus({ hasVoted: true }) }), "feature");
    expect(screen.getByRole("link", { name: "View ASA Senate Fall 2026" })).toHaveAttribute("href", "/elections/e1");
  });
});
