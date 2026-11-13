import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { SegmentedControl } from "./SegmentedControl";
import { TabPanel } from "./TabPanel";

const ITEMS = [
  { id: "active", label: "Active" },
  { id: "upcoming", label: "Upcoming" },
  { id: "past", label: "Past" },
] as const;

type ItemId = (typeof ITEMS)[number]["id"];

function Harness({ initial = "active" as ItemId }) {
  const [value, setValue] = useState<ItemId>(initial);
  return (
    <>
      <SegmentedControl id="t" label="Election status" items={ITEMS} value={value} onChange={setValue} />
      <TabPanel tabsId="t" value={value}>
        Panel: {value}
      </TabPanel>
    </>
  );
}

const tab = (name: string) => screen.getByRole("tab", { name });

describe("SegmentedControl", () => {
  it("exposes tablist / tab / tabpanel roles with correct aria wiring", () => {
    render(<Harness />);
    expect(screen.getByRole("tablist", { name: "Election status" })).toBeInTheDocument();
    expect(tab("Active")).toHaveAttribute("aria-selected", "true");
    expect(tab("Active")).toHaveAttribute("tabindex", "0");
    expect(tab("Upcoming")).toHaveAttribute("aria-selected", "false");
    expect(tab("Upcoming")).toHaveAttribute("tabindex", "-1");

    const panel = screen.getByRole("tabpanel");
    expect(tab("Active")).toHaveAttribute("aria-controls", panel.id);
    expect(panel).toHaveAttribute("aria-labelledby", tab("Active").id);
  });

  it("selects a segment on click", async () => {
    render(<Harness />);
    await userEvent.click(tab("Past"));
    expect(tab("Past")).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Panel: past");
  });

  it("moves focus and selection with arrow keys, wrapping at both ends", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(tab("Active"));

    await user.keyboard("{ArrowRight}");
    expect(tab("Upcoming")).toHaveFocus();
    expect(tab("Upcoming")).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Panel: upcoming");

    await user.keyboard("{ArrowRight}{ArrowRight}");
    expect(tab("Active")).toHaveFocus();

    await user.keyboard("{ArrowLeft}");
    expect(tab("Past")).toHaveFocus();
    expect(tab("Past")).toHaveAttribute("aria-selected", "true");
  });

  it("jumps to the first and last segment with Home and End", async () => {
    const user = userEvent.setup();
    render(<Harness initial="upcoming" />);
    await user.click(tab("Upcoming"));

    await user.keyboard("{End}");
    expect(tab("Past")).toHaveFocus();
    expect(tab("Past")).toHaveAttribute("aria-selected", "true");

    await user.keyboard("{Home}");
    expect(tab("Active")).toHaveFocus();
    expect(tab("Active")).toHaveAttribute("aria-selected", "true");
  });

  it("keeps a single tab stop: Tab moves from the selected segment into the panel", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.tab();
    expect(tab("Active")).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("tabpanel")).toHaveFocus();
  });

  it("ignores unrelated keys", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(tab("Active"));
    await user.keyboard("{ArrowDown}a");
    expect(tab("Active")).toHaveFocus();
    expect(tab("Active")).toHaveAttribute("aria-selected", "true");
  });
});
