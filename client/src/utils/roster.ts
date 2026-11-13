import type { ImportCounts, ImportMode, RosterIssue } from "@asa/shared";

/** Server limit for roster uploads (413 above this). */
export const MAX_ROSTER_BYTES = 2 * 1024 * 1024;
export const ROSTER_ACCEPT = ".txt,.csv";

export const IMPORT_MODE_LABELS: Record<ImportMode, string> = {
  MERGE: "Merge",
  FULL_SYNC: "Full sync",
};

export const IMPORT_MODE_DESCRIPTIONS: Record<ImportMode, string> = {
  MERGE: "Add new students and update existing ones. Nobody is removed.",
  FULL_SYNC:
    "Also marks students missing from this file as off-roster. They lose voting eligibility but are never deleted.",
};

/** "12 KB", "1.4 MB" */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Client-side check before uploading. Returns an error message or null. */
export function validateRosterFile(file: File): string | null {
  if (!/\.(txt|csv)$/i.test(file.name)) return "Choose a .txt or .csv file.";
  if (file.size === 0) return "This file is empty.";
  if (file.size > MAX_ROSTER_BYTES) return `This file is ${formatBytes(file.size)}. The limit is 2 MB.`;
  return null;
}

/** "1–25 of 312" */
export function pageRangeLabel(page: number, pageSize: number, total: number): string {
  if (total === 0) return "0 of 0";
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  return `${start.toLocaleString()}–${end.toLocaleString()} of ${total.toLocaleString()}`;
}

export function plural(n: number, singular: string, pluralForm = `${singular}s`): string {
  return `${n.toLocaleString()} ${n === 1 ? singular : pluralForm}`;
}

/** Short one-line summary for history rows: "12 new · 3 updated · 2 off-roster". */
export function countsSummary(counts: ImportCounts): string {
  const parts = [
    counts.created ? `${counts.created.toLocaleString()} new` : null,
    counts.updated ? `${counts.updated.toLocaleString()} updated` : null,
    counts.deactivated ? `${counts.deactivated.toLocaleString()} off-roster` : null,
    counts.skipped ? `${counts.skipped.toLocaleString()} skipped` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "No changes";
}

export type IssueFilter = "all" | "errors" | "warnings";

export function filterIssues(issues: RosterIssue[], filter: IssueFilter): RosterIssue[] {
  if (filter === "errors") return issues.filter((i) => i.severity === "ERROR");
  if (filter === "warnings") return issues.filter((i) => i.severity === "WARNING");
  return issues;
}
