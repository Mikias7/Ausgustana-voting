import { useState } from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { PositionDto } from "@asa/shared";
import { BallotPosition } from "./BallotPosition";
import type { DraftChoice } from "../../utils/ballot";

const base: PositionDto = {
  id: "p1",
  title: "At-Large Senator",
  description: null,
  seats: 2,
  votingMethod: "MULTIPLE_CHOICE",
  maxSelections: 2,
  allowAbstain: true,
  allowWriteIn: false,
  eligibility: { type: "ALL_STUDENTS" },
  candidates: [
    { id: "a", name: "Ann", bio: null, photoUrl: null },
    { id: "b", name: "Ben", bio: null, photoUrl: null },
    { id: "c", name: "Cal", bio: null, photoUrl: null },
  ],
};

function Harness({ position = base, showProblem = false }: { position?: PositionDto; showProblem?: boolean }) {
  const [choice, setChoice] = useState<DraftChoice | undefined>();
  return <BallotPosition position={position} choice={choice} onChange={setChoice} showProblem={showProblem} />;
}

describe("BallotPosition", () => {
  it("is a labelled group and disables extra picks at the limit", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    expect(screen.getByRole("group", { name: "At-Large Senator" })).toBeInTheDocument();

    await user.click(screen.getByRole("checkbox", { name: /Ann/ }));
    await user.click(screen.getByRole("checkbox", { name: /Ben/ }));
    expect(screen.getByText("2 of 2 selected")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /Cal/ })).toBeDisabled();

    await user.click(screen.getByRole("checkbox", { name: /Abstain/ }));
    expect(screen.getByRole("checkbox", { name: /Ann/ })).not.toBeChecked();
    expect(screen.getByRole("checkbox", { name: /Cal/ })).toBeEnabled();
  });

  it("uses radio buttons for single choice and shows what's missing", async () => {
    const user = userEvent.setup();
    render(<Harness position={{ ...base, votingMethod: "SINGLE_CHOICE", maxSelections: 1 }} showProblem />);
    expect(screen.getByRole("alert")).toHaveTextContent("Choose a candidate or abstain");

    await user.click(screen.getByRole("radio", { name: /Ann/ }));
    await user.click(screen.getByRole("radio", { name: /Ben/ }));
    expect(screen.getByRole("radio", { name: /Ann/ })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: /Ben/ })).toBeChecked();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
