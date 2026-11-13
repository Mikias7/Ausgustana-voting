import type { ClassStanding, RosterIssue } from "@asa/shared";

/**
 * Parser for the university roster file (docs/ARCHITECTURE.md §2).
 * Pure: no I/O, no database. importRoster.service.ts consumes its output.
 *
 * Format: no header, CRLF or LF, pipe-delimited, 5 fields per line:
 *   Lastname|Firstname|username|email|classCode
 */

export interface RosterRow {
  line: number;
  lastName: string;
  firstName: string;
  /** Lowercased. */
  username: string;
  /** Lowercased. */
  email: string;
  classStanding: ClassStanding | null;
}

export interface ParseRosterResult {
  rows: RosterRow[];
  issues: RosterIssue[];
}

export interface ParseRosterOptions {
  /** Lowercase email domains, e.g. ["ole.augie.edu"]. */
  allowedEmailDomains: readonly string[];
  /** Upper-case class code → standing. Defaults to DEFAULT_CLASS_CODE_MAP. */
  classCodeMap?: Readonly<Record<string, ClassStanding>>;
}

/** Registrar codes: "FF" = first-year (Freshman), "GS" = graduate student. */
export const DEFAULT_CLASS_CODE_MAP: Readonly<Record<string, ClassStanding>> = {
  FF: "FR",
  FR: "FR",
  SO: "SO",
  JR: "JR",
  SR: "SR",
  GS: "GR",
  GR: "GR",
};

const EXPECTED_FIELDS = 5;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_PATTERN = /^[a-z0-9._-]+$/;

export function parseRoster(text: string, options: ParseRosterOptions): ParseRosterResult {
  const classCodeMap = options.classCodeMap ?? DEFAULT_CLASS_CODE_MAP;
  const allowedDomains = new Set(options.allowedEmailDomains.map((d) => d.toLowerCase()));

  const rows: RosterRow[] = [];
  const issues: RosterIssue[] = [];
  const firstLineByUsername = new Map<string, number>();
  const firstLineByEmail = new Map<string, number>();

  const lines = text.replace(/^﻿/, "").split(/\r\n|\r|\n/);

  lines.forEach((rawLine, index) => {
    const line = index + 1;
    if (rawLine.trim() === "") return;

    const fields = rawLine.split("|").map((f) => f.trim());
    if (fields.length !== EXPECTED_FIELDS) {
      issues.push({
        line,
        severity: "ERROR",
        message: `Expected ${EXPECTED_FIELDS} fields, found ${fields.length}`,
      });
      return;
    }

    const [lastName, firstName, rawUsername, rawEmail, rawClassCode] = fields as [string, string, string, string, string];
    const username = rawUsername.toLowerCase();
    const email = rawEmail.toLowerCase();
    const issueBase = { line, ...(username ? { username } : {}) };

    const errors: string[] = [];
    if (!lastName) errors.push("Last name is required");
    if (!firstName) errors.push("First name is required");
    if (!username) errors.push("Username is required");
    else if (!USERNAME_PATTERN.test(username)) errors.push("Username contains invalid characters");

    if (!email) {
      errors.push("Email is required");
    } else if (!EMAIL_PATTERN.test(email)) {
      errors.push(`Invalid email address "${email}"`);
    } else {
      const domain = email.slice(email.lastIndexOf("@") + 1);
      if (!allowedDomains.has(domain)) errors.push(`Email domain "${domain}" is not allowed`);
    }

    if (errors.length === 0) {
      const dupUsernameLine = firstLineByUsername.get(username);
      const dupEmailLine = firstLineByEmail.get(email);
      if (dupUsernameLine !== undefined) errors.push(`Duplicate username (first seen on line ${dupUsernameLine})`);
      if (dupEmailLine !== undefined) errors.push(`Duplicate email (first seen on line ${dupEmailLine})`);
    }

    if (errors.length > 0) {
      for (const message of errors) issues.push({ ...issueBase, severity: "ERROR", message });
      return;
    }

    firstLineByUsername.set(username, line);
    firstLineByEmail.set(email, line);

    const classCode = rawClassCode.toUpperCase();
    const classStanding = classCodeMap[classCode] ?? null;
    if (!classStanding) {
      issues.push({
        ...issueBase,
        severity: "WARNING",
        message: classCode
          ? `Unknown class code "${classCode}"; imported without a class`
          : "Missing class code; imported without a class",
      });
    }

    const localPart = email.slice(0, email.lastIndexOf("@"));
    if (localPart !== username) {
      issues.push({
        ...issueBase,
        severity: "WARNING",
        message: `Email "${email}" does not match username "${username}"`,
      });
    }

    rows.push({ line, lastName, firstName, username, email, classStanding });
  });

  return { rows, issues };
}
