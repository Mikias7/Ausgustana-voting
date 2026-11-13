import type { ImportHistoryItem, ImportSummary, Paginated, RosterStats, StudentListItem } from "@asa/shared";
import { getImport, getRosterStats, listImports, listStudents, type StudentFilters } from "../api/admin/roster";
import { useAsync, type AsyncState } from "./useAsync";

/** Header numbers for the Students page (and the dashboard row). */
export function useRosterStats(options: { enabled?: boolean } = {}): AsyncState<RosterStats> {
  return useAsync((signal) => getRosterStats(signal), [], options);
}

/** One page of students. Keeps the previous page's data while the next one loads. */
export function useStudents(filters: StudentFilters): AsyncState<Paginated<StudentListItem>> {
  const { search, class: classFilter, roster, page, pageSize } = filters;
  return useAsync(
    (signal) => listStudents({ search, class: classFilter, roster, page, pageSize }, signal),
    [search, classFilter, roster, page, pageSize],
  );
}

export function useImportHistory(): AsyncState<ImportHistoryItem[]> {
  return useAsync((signal) => listImports(signal), []);
}

/** Full summary of one past import; idle while `id` is null. */
export function useImportDetail(id: string | null): AsyncState<ImportSummary> {
  return useAsync((signal) => getImport(id!, signal), [id], { enabled: id !== null });
}
