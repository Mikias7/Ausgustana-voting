import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { DestructiveSyncDialog } from "./DestructiveSyncDialog";

describe("DestructiveSyncDialog", () => {
  it("keeps the danger button disabled until SYNC is typed", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<DestructiveSyncDialog open offRosterCount={180} onConfirm={onConfirm} onCancel={vi.fn()} />);

    expect(screen.getByRole("dialog")).toHaveAccessibleDescription(/180 students off-roster/);
    const input = screen.getByLabelText(/Type SYNC to confirm/);
    expect(input).toHaveFocus();
    const confirm = screen.getByRole("button", { name: "Sync anyway" });
    expect(confirm).toBeDisabled();

    await user.type(input, "sync");
    expect(confirm).toBeDisabled();
    await user.keyboard("{Enter}");
    expect(onConfirm).not.toHaveBeenCalled();

    await user.clear(input);
    await user.type(input, "SYNC");
    expect(confirm).toBeEnabled();
    await user.click(confirm);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("cancels without confirming", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(<DestructiveSyncDialog open onConfirm={onConfirm} onCancel={onCancel} />);
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
