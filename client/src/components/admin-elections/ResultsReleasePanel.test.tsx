import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ElectionResults, PositionResult } from "@asa/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "../../api/admin/elections";
import { ResultsReleasePanel } from "./ResultsReleasePanel";

vi.mock("../../api/admin/elections", () => ({
  getElectionResults: vi.fn(),
  publishResults: vi.fn(),
  unpublishResults: vi.fn(),
}));

const position = (overrides: Partial<PositionResult> = {}): PositionResult => ({
  positionId: "p1",
  title: "President",
  seats: 1,
  votingMethod: "SINGLE_CHOICE",
  totalBallots: 3,
  abstentions: 1,
  tie: false,
  candidates: [
    { candidateId: "a", name: "Ann Lee", writeIn: false, votes: 2, outcome: "WON" },
    { candidateId: "b", name: "Ben Ode", writeIn: false, votes: 0, outcome: null },
  ],
  ...overrides,
});

const results = (positions: PositionResult[]): ElectionResults => ({
  electionId: "e1",
  title: "ASA General Election",
  organizationName: "ASA",
  closedAt: "2026-11-10T23:00:00Z",
  released: false,
  publishedAt: null,
  turnout: { voted: 3, eligible: 10 },
  positions,
});

const election = {
  id: "e1",
  title: "ASA General Election",
  resultsRelease: "MANUAL" as const,
  resultsVisibility: "STUDENTS" as const,
  resultsPublishedAt: null,
  showTurnout: true,
};

function setup(positions: PositionResult[]) {
  vi.mocked(api.getElectionResults).mockResolvedValue(results(positions));
  vi.mocked(api.publishResults).mockResolvedValue(results(positions));
  const onChanged = vi.fn().mockResolvedValue(undefined);
  const onNotice = vi.fn();
  render(<ResultsReleasePanel election={election} onChanged={onChanged} onNotice={onNotice} />);
  return { onChanged, onNotice };
}

describe("ResultsReleasePanel", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows the tally with turnout and winners", async () => {
    setup([position({ totalBallots: 8 })]);
    expect(await screen.findByText("Ann Lee")).toBeInTheDocument();
    expect(screen.getByText("Elected")).toBeInTheDocument();
    expect(screen.getByText("30%")).toBeInTheDocument(); // turnout 3 of 10
    expect(screen.getByRole("heading", { name: "Not released" })).toBeInTheDocument();
    expect(screen.queryByText(/Low turnout/)).not.toBeInTheDocument();
  });

  it("requires acknowledging low turnout before releasing", async () => {
    const user = userEvent.setup();
    const { onChanged, onNotice } = setup([position({ totalBallots: 3 })]);
    expect(await screen.findByText(/Low turnout could reveal/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Release results" }));
    const dialog = screen.getByRole("dialog");
    const confirm = within(dialog).getByRole("button", { name: "Release results" });
    expect(confirm).toBeDisabled();

    await user.click(within(dialog).getByRole("checkbox"));
    await user.click(confirm);
    expect(api.publishResults).toHaveBeenCalledWith("e1", true);
    expect(onChanged).toHaveBeenCalled();
    expect(onNotice).toHaveBeenCalledWith(expect.objectContaining({ tone: "success", title: "Results released" }));
  });

  it("releases without the checkbox when turnout is fine", async () => {
    const user = userEvent.setup();
    setup([position({ totalBallots: 12 })]);
    await screen.findByText("Ann Lee");
    await user.click(screen.getByRole("button", { name: "Release results" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).queryByRole("checkbox")).not.toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Release results" }));
    expect(api.publishResults).toHaveBeenCalledWith("e1", false);
  });

  it("explains ties", async () => {
    setup([
      position({
        totalBallots: 6,
        tie: true,
        candidates: [
          { candidateId: "a", name: "Ann Lee", writeIn: false, votes: 3, outcome: "TIED" },
          { candidateId: null, name: "Ada Lovelace", writeIn: true, votes: 3, outcome: "TIED" },
        ],
      }),
    ]);
    expect(await screen.findAllByText("Tied")).toHaveLength(3); // two chips + the explanation
    expect(screen.getByText("Write-in")).toBeInTheDocument();
    expect(screen.queryByText("Elected")).not.toBeInTheDocument();
  });
});
