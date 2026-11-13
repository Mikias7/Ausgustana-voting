import type { ClassStanding, ImportMode } from "./enums";

/**
 * Student roster import (admin only). See docs/ARCHITECTURE.md §2.
 * Flow: POST /api/admin/imports?dryRun=true  → ImportSummary (nothing saved)
 *       POST /api/admin/imports?dryRun=false → ImportSummary (saved, with id)
 * Both are multipart/form-data with fields: file (the roster .txt/.csv), mode (ImportMode).
 */

export type IssueSeverity = "ERROR" | "WARNING";

export interface RosterIssue {
  /** Physical line number in the uploaded file (1-based). */
  line: number;
  username?: string;
  severity: IssueSeverity;
  message: string;
}

export interface ImportCounts {
  /** Valid rows in the file. */
  valid: number;
  created: number;
  updated: number;
  unchanged: number;
  /** FULL_SYNC only: students marked off-roster because they are not in the file. */
  deactivated: number;
  /** Rows skipped because of errors. */
  skipped: number;
  warnings: number;
}

export interface ImportSummary {
  /** null for a dry run. */
  id: string | null;
  dryRun: boolean;
  mode: ImportMode;
  fileName: string;
  counts: ImportCounts;
  issues: RosterIssue[];
  /** True when an election is currently open; the UI warns before confirming. */
  openElectionWarning: boolean;
  createdAt: string | null;
  uploadedBy: string | null;
}

/** Row in GET /api/admin/imports (history). */
export interface ImportHistoryItem {
  id: string;
  fileName: string;
  mode: ImportMode;
  counts: ImportCounts;
  issueCount: number;
  uploadedBy: string | null;
  createdAt: string;
}

/** Row in GET /api/admin/students?search=&class=&roster=on|off|all&page=&pageSize= → Paginated<StudentListItem> */
export interface StudentListItem {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  classStanding: ClassStanding | null;
  onRoster: boolean;
  updatedAt: string;
}

/** Summary numbers for the admin Students page header. GET /api/admin/students/stats */
export interface RosterStats {
  onRoster: number;
  offRoster: number;
  byClass: Record<ClassStanding | "NONE", number>;
  lastImportAt: string | null;
}

/** `details` of a 400 IMPORT_EMPTY error (file had no valid rows). */
export interface ImportEmptyErrorDetails {
  /** Up to 200 issues explaining why rows were rejected. */
  issues: RosterIssue[];
}

/** `details` of a 400 IMPORT_SYNC_TOO_DESTRUCTIVE error (commit only; resend with confirmDestructive=true). */
export interface ImportTooDestructiveErrorDetails {
  deactivated: number;
  onRoster: number;
  thresholdRatio: number;
}
