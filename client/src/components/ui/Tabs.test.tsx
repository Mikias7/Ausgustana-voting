import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { TabPanel, Tabs } from "./Tabs";

const TABS = [
  { id: "active", label: "Active" },
  { id: "upcoming", label: "Upcoming" },
  { id: "past", label: "Past" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function Harness({ initial = "active" as TabId }) {
  const [value, setValue] = useState<TabId>(initial);
  return (
    <>
      <Tabs id="t" label="Election status" tabs={TABS} value={value} onChange={setValue} />
      <TabPanel tabsId="t" value={value}>
        Panel: {value}
      </TabPanel>
    </>
  );
}

describe("Tabs", () => {
  it("exposes tablist / tab / tabpanel roles with correct aria wiring", () => {
    render(<Harness />);
    expect(screen.getByRole("tablist", { name: "Election status" })).toBeInTheDocument();
    const active = screen.getByRole("tab", { name: "Active" });
    expect(active).toHaveAttribute("aria-selected", "true");
    expect(active).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("tab", { name: "Upcoming" })).toHaveAttribute("tabindex", "-1");

    const panel = screen.getByRole("tabpanel");
    expect(active).toHaveAttribute("aria-controls", panel.id);
    expect(panel).toHaveAttribute("aria-labelledby", active.id);
  });

  it("selects a tab on click", async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole("tab", { name: "Past" }));
    expect(screen.getByRole("tab", { name: "Past" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveTextContent("Panel: past");
  });

  it("supports arrow keys, Home and End with wrap-around", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("tab", { name: "Active" }));

    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Upcoming" })).toHaveFocus();
    expect(screen.getByRole("tab", { name: "Upcoming" })).toHaveAttribute("aria-selected", "true");

    await user.keyboard("{End}");
    expect(screen.getByRole("tab", { name: "Past" })).toHaveFocus();

    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Active" })).toHaveFocus();

    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("tab", { name: "Past" })).toHaveAttribute("aria-selected", "true");

    await user.keyboard("{Home}");
    expect(screen.getByRole("tab", { name: "Active" })).toHaveAttribute("aria-selected", "true");
  });
});
