import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import type { StudentClassFilter, StudentFilters, StudentRosterFilter } from "../api/admin/roster";
import { useSearchParamState } from "./useSearchParamState";

export const STUDENTS_PAGE_SIZE = 25;

export type ClassFilterValue = "all" | StudentClassFilter;
const CLASS_VALUES: readonly ClassFilterValue[] = ["all", "FR", "SO", "JR", "SR", "NONE"];
const ROSTER_VALUES: readonly StudentRosterFilter[] = ["all", "on", "off"];
const RESET_PAGE = { resetKeys: ["page"] } as const;

/**
 * Students table filters, synced to the URL: `?q=&class=&roster=&page=`.
 * Changing a filter or the search goes back to page 1.
 */
export function useStudentFilters() {
  const [params, setParams] = useSearchParams();
  const [classFilter, setClassFilter] = useSearchParamState<ClassFilterValue>("class", CLASS_VALUES, "all", RESET_PAGE);
  const [roster, setRoster] = useSearchParamState<StudentRosterFilter>("roster", ROSTER_VALUES, "all", RESET_PAGE);
  const search = params.get("q") ?? "";
  const parsedPage = Number.parseInt(params.get("page") ?? "1", 10);
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  const update = useCallback(
    (patch: Record<string, string | null>) =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [k, v] of Object.entries(patch)) {
            if (v) next.set(k, v);
            else next.delete(k);
          }
          return next;
        },
        { replace: true, preventScrollReset: true },
      ),
    [setParams],
  );

  const setSearch = useCallback((value: string) => update({ q: value.trim() || null, page: null }), [update]);
  const setPage = useCallback((value: number) => update({ page: value > 1 ? String(value) : null }), [update]);
  const clear = useCallback(() => update({ q: null, class: null, roster: null, page: null }), [update]);

  const apiFilters: StudentFilters = {
    search: search || undefined,
    class: classFilter === "all" ? undefined : classFilter,
    roster,
    page,
    pageSize: STUDENTS_PAGE_SIZE,
  };

  return {
    search,
    classFilter,
    roster,
    page,
    filtered: Boolean(search) || classFilter !== "all" || roster !== "all",
    apiFilters,
    setSearch,
    setClassFilter,
    setRoster,
    setPage,
    clear,
  };
}
