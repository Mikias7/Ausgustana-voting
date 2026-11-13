import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "../../api/client";
import { positionFormFrom, validatePositionForm } from "../../utils/adminElections";
import { PositionFormSheet } from "./PositionFormSheet";

function renderSheet(onSubmit = vi.fn().mockResolvedValue(undefined), onClose = vi.fn()) {
  render(
    <MemoryRouter>
      <PositionFormSheet open voterLists={[]} onSubmit={onSubmit} onClose={onClose} />
    </MemoryRouter>,
  );
  return { onSubmit, onClose };
}

describe("validatePositionForm", () => {
  it("forces one selection for single choice", () => {
    const result = validatePositionForm({ ...positionFormFrom(), title: "President", maxSelections: "5" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.maxSelections).toBe(1);
  });

  it("returns friendly field errors from the shared schema", () => {
    const result = validatePositionForm({
      ...positionFormFrom(),
      title: "x",
      votingMethod: "MULTIPLE_CHOICE",
      seats: "0",
      maxSelections: "abc",
      eligibility: { type: "CLASS_STANDING", classes: [] },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.title).toMatch(/between 2 and 120/);
      expect(result.errors.seats).toMatch(/1 to 20/);
      expect(result.errors.maxSelections).toBeDefined();
      expect(result.errors.eligibility).toBe("Choose at least one class year.");
    }
  });
});

describe("PositionFormSheet", () => {
  it("shows zod errors next to the fields and doesn't submit", async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderSheet();
    await user.click(screen.getByRole("button", { name: "Add position" }));
    expect(screen.getByText("Enter a title between 2 and 120 characters.")).toBeInTheDocument();
    expect(screen.getByLabelText(/Title/)).toHaveAttribute("aria-invalid", "true");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("locks choices per voter to 1 for single choice and unlocks it for multiple", async () => {
    const user = userEvent.setup();
    const { onSubmit, onClose } = renderSheet();
    const max = screen.getByLabelText("Choices per voter");
    expect(max).toBeDisabled();
    expect(max).toHaveValue(1);

    await user.click(screen.getByRole("tab", { name: "Multiple choice" }));
    expect(max).toBeEnabled();
    await user.clear(screen.getByLabelText("Seats"));
    await user.type(screen.getByLabelText("Seats"), "3");
    await user.clear(max);
    await user.type(max, "3");

    await user.click(screen.getByRole("tab", { name: "Single choice" }));
    expect(max).toBeDisabled();
    expect(max).toHaveValue(1);

    await user.type(screen.getByLabelText(/Title/), "Senator");
    await user.click(screen.getByRole("button", { name: "Add position" }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Senator", votingMethod: "SINGLE_CHOICE", seats: 3, maxSelections: 1 }),
    );
    expect(onClose).toHaveBeenCalled();
  });

  it("maps server VALIDATION_ERROR details to fields", async () => {
    const user = userEvent.setup();
    const onSubmit = vi
      .fn()
      .mockRejectedValue(
        new ApiError(400, "VALIDATION_ERROR", "Invalid", [{ path: ["body", "title"], message: "Title already used" }]),
      );
    const { onClose } = renderSheet(onSubmit);
    await user.type(screen.getByLabelText(/Title/), "President");
    await user.click(screen.getByRole("button", { name: "Add position" }));
    expect(await screen.findByText("Title already used")).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });
});
