import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Paginated, StudentListItem } from "@asa/shared";
import { describe, expect, it, vi } from "vitest";
import { StudentsTable } from "./StudentsTable";

const student = (id: string, overrides: Partial<StudentListItem> = {}): StudentListItem => ({
  id,
  username: `user${id}`,
  email: `user${id}@example.edu`,
  firstName: "Student",
  lastName: id,
  classStanding: "SR",
  onRoster: true,
  updatedAt: "2026-11-01T00:00:00Z",
  ...overrides,
});

const page = (items: StudentListItem[], extra: Partial<Paginated<StudentListItem>> = {}) => ({
  items,
  page: 1,
  pageSize: 25,
  total: items.length,
  ...extra,
});

const baseProps = {
  loading: false,
  error: undefined,
  onRetry: vi.fn(),
  filtered: false,
  onClearFilters: vi.fn(),
  onPageChange: vi.fn(),
};

describe("StudentsTable", () => {
  it("renders a row per student with class and roster status", () => {
    render(
      <StudentsTable
        {...baseProps}
        data={page([student("A"), student("B", { classStanding: null, onRoster: false })], { total: 312 })}
      />,
    );
    const table = screen.getByRole("table", { name: "Students" });
    const rows = within(table).getAllByRole("row").slice(1);
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByRole("rowheader")).toHaveTextContent("Student A");
    expect(within(rows[0]).getByText("Senior")).toBeInTheDocument();
    expect(within(rows[0]).getByText("On roster")).toBeInTheDocument();
    expect(within(rows[1]).getByText("No class")).toBeInTheDocument();
    expect(within(rows[1]).getByText("Off roster")).toBeInTheDocument();
    expect(screen.getByText("1–25 of 312")).toBeInTheDocument();
  });

  it("pages with Prev/Next", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(
      <StudentsTable {...baseProps} onPageChange={onPageChange} data={page([student("A")], { page: 2, total: 60 })} />,
    );
    expect(screen.getByText("26–50 of 60")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(onPageChange).toHaveBeenCalledWith(3);
    await user.click(screen.getByRole("button", { name: "Prev" }));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it("shows an empty state, with Clear filters when filtered", async () => {
    const user = userEvent.setup();
    const onClearFilters = vi.fn();
    const { rerender } = render(<StudentsTable {...baseProps} data={page([])} />);
    expect(screen.getByText("No students yet")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();

    rerender(<StudentsTable {...baseProps} filtered onClearFilters={onClearFilters} data={page([])} />);
    expect(screen.getByText("No students match")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(onClearFilters).toHaveBeenCalled();
  });

  it("shows skeletons while the first page loads", () => {
    render(<StudentsTable {...baseProps} loading data={undefined} />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading students");
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});
