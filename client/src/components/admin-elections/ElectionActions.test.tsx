import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ElectionPhase } from "@asa/shared";
import { describe, expect, it, vi } from "vitest";
import { actionsForPhase } from "../../utils/adminElections";
import { ElectionActions } from "./ElectionActions";

const base = {
  id: "e1",
  title: "ASA General Election",
  startsAt: "2026-11-20T15:00:00Z",
  endsAt: "2026-11-22T23:00:00Z",
  votedCount: 12,
  publishIssues: [] as { code: string; message: string }[],
};

function renderActions(phase: ElectionPhase, extra: Partial<typeof base> = {}) {
  const onAction = vi.fn().mockResolvedValue(undefined);
  render(<ElectionActions election={{ ...base, ...extra, phase }} onAction={onAction} />);
  return onAction;
}

const names = () => [...screen.getAllByRole("button"), ...screen.queryAllByRole("link")].map((b) => b.textContent?.replace(" (opens in a new tab)", ""));

describe("ElectionActions", () => {
  it.each([
    ["draft", ["Publish", "Delete draft", "Duplicate"]],
    ["upcoming", ["Unpublish", "Cancel election", "Duplicate", "View public page"]],
    ["open", ["Close voting early", "Cancel election", "Duplicate", "View public page"]],
    ["closed", ["Duplicate", "View public page"]],
    ["cancelled", ["Duplicate", "View public page"]],
  ] as const)("shows the right actions for %s elections", (phase, expected) => {
    renderActions(phase);
    expect(names()).toEqual(expected);
    expect(actionsForPhase(phase)).toHaveLength(expected.length);
  });

  it("disables Publish while the checklist has issues", () => {
    renderActions("draft", { publishIssues: [{ code: "NO_POSITIONS", message: "Add a position." }] });
    expect(screen.getByRole("button", { name: "Publish" })).toBeDisabled();
  });

  it("confirms before publishing and explains what happens", async () => {
    const user = userEvent.setup();
    const onAction = renderActions("draft");
    await user.click(screen.getByRole("button", { name: "Publish" }));
    const dialog = screen.getByRole("dialog", { name: "Publish this election?" });
    expect(dialog).toHaveTextContent(/Students will see/);
    expect(dialog).toHaveTextContent(/Voting opens automatically/);
    await user.click(within(dialog).getByRole("button", { name: "Publish" }));
    expect(onAction).toHaveBeenCalledWith("publish");
  });

  it("uses a danger confirm to close voting early", async () => {
    const user = userEvent.setup();
    const onAction = renderActions("open");
    await user.click(screen.getByRole("button", { name: "Close voting early" }));
    const dialog = screen.getByRole("dialog", { name: "Close voting now?" });
    expect(dialog).toHaveTextContent("12 students have voted so far");
    await user.click(within(dialog).getByRole("button", { name: "Keep voting open" }));
    expect(onAction).not.toHaveBeenCalled();
  });

  it("duplicates without a confirm and links to the public page", async () => {
    const user = userEvent.setup();
    const onAction = renderActions("closed");
    expect(screen.getByRole("link", { name: /View public page/ })).toHaveAttribute("href", "/elections/e1");
    await user.click(screen.getByRole("button", { name: "Duplicate" }));
    expect(onAction).toHaveBeenCalledWith("duplicate");
  });
});
