import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PublishChecklist } from "./PublishChecklist";

describe("PublishChecklist", () => {
  it("shows a ready state when there are no issues", () => {
    render(<PublishChecklist issues={[]} />);
    expect(screen.getByText("Ready to publish")).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("lists each issue, naming the position, and jumps to position issues", async () => {
    const user = userEvent.setup();
    const onIssueClick = vi.fn();
    const issues = [
      { code: "ENDS_IN_PAST", message: "The end time is in the past." },
      { code: "POSITION_NO_CANDIDATES", message: "Add at least one candidate.", positionId: "p1" },
    ];
    render(<PublishChecklist issues={issues} positionTitles={{ p1: "President" }} onIssueClick={onIssueClick} />);

    expect(screen.getByText("Before you can publish")).toBeInTheDocument();
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("The end time is in the past.");
    expect(items[1]).toHaveTextContent("President: Add at least one candidate.");

    await user.click(screen.getByRole("button", { name: /President/ }));
    expect(onIssueClick).toHaveBeenCalledWith(issues[1]);
  });
});
