import type {
  ImportHistoryItem,
  ImportMode,
  ImportSummary,
  Paginated,
  RosterStats,
  StudentListItem,
} from "@asa/shared";
import { api, request } from "../client";

/** Error codes the import endpoint returns (besides generic HTTP errors). */
export const IMPORT_ERROR_CODES = {
  empty: "IMPORT_EMPTY",
  tooDestructive: "IMPORT_SYNC_TOO_DESTRUCTIVE",
} as const;

export interface RosterImportRequest {
  file: File;
  mode: ImportMode;
  /** true = validate and report only; nothing is saved. */
  dryRun: boolean;
  /** Sent only after the admin explicitly confirmed a full sync that removes >50% of the roster. */
  confirmDestructive?: boolean;
}

/**
 * POST /api/admin/imports?dryRun=… as multipart/form-data (file, mode, confirmDestructive).
 * The api client leaves Content-Type to the browser so the multipart boundary is set.
 */
export function postRosterImport(
  { file, mode, dryRun, confirmDestructive }: RosterImportRequest,
  signal?: AbortSignal,
): Promise<ImportSummary> {
  const form = new FormData();
  form.append("file", file, file.name);
  form.append("mode", mode);
  if (confirmDestructive) form.append("confirmDestructive", "true");
  return request<ImportSummary>("/admin/imports", {
    method: "POST",
    body: form,
    query: { dryRun: dryRun ? "true" : "false" },
    signal,
  });
}

export function listImports(signal?: AbortSignal): Promise<ImportHistoryItem[]> {
  return api.get<ImportHistoryItem[]>("/admin/imports", undefined, signal);
}

export function getImport(id: string, signal?: AbortSignal): Promise<ImportSummary> {
  return api.get<ImportSummary>(`/admin/imports/${encodeURIComponent(id)}`, undefined, signal);
}

export type StudentClassFilter = "FR" | "SO" | "JR" | "SR" | "NONE";
export type StudentRosterFilter = "all" | "on" | "off";

export interface StudentFilters {
  search?: string;
  class?: StudentClassFilter;
  roster?: StudentRosterFilter;
  page?: number;
  pageSize?: number;
}

export function listStudents(filters: StudentFilters = {}, signal?: AbortSignal): Promise<Paginated<StudentListItem>> {
  return api.get<Paginated<StudentListItem>>(
    "/admin/students",
    {
      search: filters.search?.trim() || undefined,
      class: filters.class,
      roster: filters.roster,
      page: filters.page,
      pageSize: filters.pageSize,
    },
    signal,
  );
}

export function getRosterStats(signal?: AbortSignal): Promise<RosterStats> {
  return api.get<RosterStats>("/admin/students/stats", undefined, signal);
}
