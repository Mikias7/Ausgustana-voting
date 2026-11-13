import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ImportSummary } from "@asa/shared";
import { describe, expect, it } from "vitest";
import { ImportSummaryView } from "./ImportSummaryView";

function summary(overrides: Partial<ImportSummary> = {}): ImportSummary {
  return {
    id: null,
    dryRun: true,
    mode: "FULL_SYNC",
    fileName: "fall-2026.txt",
    counts: { valid: 310, created: 12, updated: 40, unchanged: 258, deactivated: 7, skipped: 2, warnings: 1 },
    issues: [
      { line: 4, username: "jdoe", severity: "ERROR", message: "Email is missing" },
      { line: 9, severity: "ERROR", message: "Unknown class \"XX\"" },
      { line: 15, username: "asmith", severity: "WARNING", message: "Duplicate username; later row used" },
    ],
    openElectionWarning: false,
    createdAt: null,
    uploadedBy: null,
    ...overrides,
  };
}

const countFor = (container: HTMLElement, key: string) =>
  container.querySelector(`[data-count="${key}"] dd`)?.textContent;

describe("ImportSummaryView", () => {
  it("renders every count, including off-roster for a full sync", () => {
    const { container } = render(<ImportSummaryView summary={summary()} />);
    expect(countFor(container, "created")).toBe("12");
    expect(countFor(container, "updated")).toBe("40");
    expect(countFor(container, "unchanged")).toBe("258");
    expect(countFor(container, "deactivated")).toBe("7");
    expect(countFor(container, "skipped")).toBe("2");
    expect(countFor(container, "warnings")).toBe("1");
    expect(screen.getByText(/fall-2026\.txt · Full sync · 310 valid rows/)).toBeInTheDocument();
  });

  it("hides off-roster for a merge", () => {
    const { container } = render(<ImportSummaryView summary={summary({ mode: "MERGE" })} />);
    expect(container.querySelector('[data-count="deactivated"]')).toBeNull();
  });

  it("shows the open-election alert only when flagged", () => {
    const { rerender } = render(<ImportSummaryView summary={summary()} />);
    expect(screen.queryByText("An election is open right now")).not.toBeInTheDocument();
    rerender(<ImportSummaryView summary={summary({ openElectionWarning: true })} />);
    expect(screen.getByText("An election is open right now")).toBeInTheDocument();
    expect(screen.getByText(/Changes take effect immediately for eligibility/)).toBeInTheDocument();
  });

  it("lists issues with line, username and severity, and filters them", async () => {
    const user = userEvent.setup();
    render(<ImportSummaryView summary={summary()} />);
    const list = () => screen.getByRole("list", { name: "Issues" });

    expect(within(list()).getAllByRole("listitem")).toHaveLength(3);
    expect(within(list()).getByText("Line 4 · jdoe")).toBeInTheDocument();
    expect(within(list()).getAllByText("Error · row skipped")).toHaveLength(2);

    await user.click(screen.getByRole("tab", { name: /Warnings/ }));
    expect(within(list()).getAllByRole("listitem")).toHaveLength(1);
    expect(within(list()).getByText(/Duplicate username/)).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /Errors/ }));
    expect(within(list()).getAllByRole("listitem")).toHaveLength(2);
    expect(within(list()).queryByText(/Duplicate username/)).not.toBeInTheDocument();
  });

  it("shows an empty state when there are no issues", () => {
    render(<ImportSummaryView summary={summary({ issues: [] })} />);
    expect(screen.getByText("No issues found")).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Issues" })).not.toBeInTheDocument();
  });
});
