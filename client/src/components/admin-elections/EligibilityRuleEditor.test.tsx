import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import type { EligibilityRule } from "@asa/shared";
import { describe, expect, it, vi } from "vitest";
import { eligibilitySentence } from "../../utils/adminElections";
import { EligibilityRuleEditor } from "./EligibilityRuleEditor";

const LIST_ID = "11111111-1111-4111-8111-111111111111";
const lists = [{ id: LIST_ID, name: "International students", memberCount: 42 }];

function Harness({ initial = { type: "ALL_STUDENTS" } as EligibilityRule, onChange = vi.fn() }) {
  const [rule, setRule] = useState<EligibilityRule>(initial);
  return (
    <MemoryRouter>
      <EligibilityRuleEditor
        id="elig"
        value={rule}
        onChange={(r) => {
          setRule(r);
          onChange(r);
        }}
        voterLists={lists}
      />
    </MemoryRouter>
  );
}

describe("EligibilityRuleEditor", () => {
  it("defaults to all students with a plain-language sentence", () => {
    render(<Harness />);
    expect(screen.getByRole("tab", { name: "All students" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("All students on the current roster can vote.")).toBeInTheDocument();
  });

  it("toggles class years and offers an Undergraduates shortcut", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    await user.click(screen.getByRole("tab", { name: "Class years" }));
    expect(onChange).toHaveBeenLastCalledWith({ type: "CLASS_STANDING", classes: [] });
    expect(screen.getByText("Choose at least one class year.")).toBeInTheDocument();

    await user.click(screen.getByRole("checkbox", { name: "Senior" }));
    await user.click(screen.getByRole("checkbox", { name: "Freshman" }));
    // Kept in class order regardless of click order.
    expect(onChange).toHaveBeenLastCalledWith({ type: "CLASS_STANDING", classes: ["FR", "SR"] });
    expect(screen.getByText("Only Freshmen and Seniors can vote.")).toBeInTheDocument();

    await user.click(screen.getByRole("checkbox", { name: "Senior" }));
    expect(onChange).toHaveBeenLastCalledWith({ type: "CLASS_STANDING", classes: ["FR"] });

    await user.click(screen.getByRole("button", { name: "Undergraduates" }));
    expect(onChange).toHaveBeenLastCalledWith({ type: "CLASS_STANDING", classes: ["FR", "SO", "JR", "SR"] });
    expect(screen.getByText(/Only undergraduates/)).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Graduate" })).not.toBeChecked();
  });

  it("picks a voter list and names it in the sentence", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    await user.click(screen.getByRole("tab", { name: "Voter list" }));
    expect(screen.getByRole("link", { name: /Manage voter lists/ })).toHaveAttribute("href", "/admin/voter-lists");
    await user.selectOptions(screen.getByRole("combobox", { name: "Voter list" }), LIST_ID);
    expect(onChange).toHaveBeenLastCalledWith({ type: "VOTER_LIST", listId: LIST_ID });
    expect(screen.getByText("Only students on the “International students” list can vote.")).toBeInTheDocument();
  });

  it("remembers class choices when switching modes back and forth", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness initial={{ type: "CLASS_STANDING", classes: ["JR"] }} onChange={onChange} />);
    await user.click(screen.getByRole("tab", { name: "All students" }));
    await user.click(screen.getByRole("tab", { name: "Class years" }));
    expect(onChange).toHaveBeenLastCalledWith({ type: "CLASS_STANDING", classes: ["JR"] });
  });

  it("shows only the sentence when disabled", () => {
    render(
      <MemoryRouter>
        <EligibilityRuleEditor
          id="e"
          value={{ type: "CLASS_STANDING", classes: ["SR"] }}
          onChange={vi.fn()}
          disabled
          disabledNote="Locked"
        />
      </MemoryRouter>,
    );
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
    expect(screen.getByText("Only Seniors can vote.")).toBeInTheDocument();
    expect(screen.getByText("Locked")).toBeInTheDocument();
  });
});

describe("eligibilitySentence", () => {
  it("describes every rule type", () => {
    expect(eligibilitySentence({ type: "CLASS_STANDING", classes: ["FR", "SO", "JR", "SR", "GR"] })).toMatch(
      /undergraduate and graduate/,
    );
    expect(eligibilitySentence({ type: "CLASS_STANDING", classes: ["GR"] })).toBe("Only Graduate students can vote.");
    expect(eligibilitySentence({ type: "VOTER_LIST", listId: "" })).toBe("Choose a voter list.");
    expect(eligibilitySentence({ type: "VOTER_LIST", listId: LIST_ID })).toBe(
      "Only students on the chosen voter list can vote.",
    );
  });
});
