import type { ClassStanding, Prisma, StudentImport } from "@prisma/client";
import type { ImportCounts, ImportHistoryItem, ImportMode, ImportSummary, RosterIssue } from "@asa/shared";
import { prisma } from "../../utils/prisma";
import { AppError } from "../../utils/AppError";
import { recordAudit, type DbClient } from "../audit.service";
import { parseRoster, type RosterRow } from "./parseRoster";

/**
 * Roster import (docs/ARCHITECTURE.md §2). The file is parsed in memory, diffed
 * against the users table by (lowercase) username, and — unless it is a dry
 * run — applied in a single transaction together with its StudentImport record
 * and a ROSTER_IMPORTED audit entry.
 */

/** FULL_SYNC refuses to deactivate more than this share of on-roster students without confirmation. */
export const DESTRUCTIVE_SYNC_RATIO = 0.5;

/** Arbitrary constant for pg_advisory_xact_lock: serializes concurrent imports. */
const IMPORT_LOCK_KEY = 4_271_001;

const TRANSACTION_OPTIONS = { maxWait: 10_000, timeout: 120_000 } as const;

export interface RunImportInput {
  fileName: string;
  /** Decoded UTF-8 text of the uploaded file. Never logged or stored. */
  content: string;
  mode: ImportMode;
  dryRun: boolean;
  actorId: string | null;
  allowedEmailDomains: readonly string[];
  /** Required to commit a FULL_SYNC that would deactivate > DESTRUCTIVE_SYNC_RATIO of on-roster students. */
  confirmDestructive?: boolean;
}

interface ExistingUser {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  classStanding: ClassStanding | null;
  onRoster: boolean;
  platformRole: "STUDENT" | "PLATFORM_ADMIN";
}

type UserChanges = Pick<Prisma.UserUpdateManyMutationInput, "firstName" | "lastName" | "email" | "classStanding" | "onRoster">;

interface ImportPlan {
  creates: RosterRow[];
  updates: { id: string; data: UserChanges }[];
  unchanged: number;
  deactivateIds: string[];
  /** On-roster STUDENT accounts before the import (denominator of the destructive-sync guard). */
  onRosterStudents: number;
  issues: RosterIssue[];
  counts: ImportCounts;
}

export async function runImport(input: RunImportInput): Promise<ImportSummary> {
  const parsed = parseRoster(input.content, { allowedEmailDomains: input.allowedEmailDomains });

  if (input.dryRun) {
    const plan = await buildPlan(prisma, parsed.rows, parsed.issues, input.mode);
    assertNotEmpty(plan);
    return {
      id: null,
      dryRun: true,
      mode: input.mode,
      fileName: input.fileName,
      counts: plan.counts,
      issues: plan.issues,
      openElectionWarning: await hasOpenElection(),
      createdAt: null,
      uploadedBy: null,
    };
  }

  const importId = await prisma.$transaction(async (tx) => {
    // One import at a time, so the diff cannot go stale before it is applied.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${IMPORT_LOCK_KEY})`;

    const plan = await buildPlan(tx, parsed.rows, parsed.issues, input.mode);
    assertNotEmpty(plan);
    assertNotTooDestructive(plan, input.confirmDestructive === true);

    const record = await tx.studentImport.create({
      data: {
        uploadedById: input.actorId,
        fileName: input.fileName,
        mode: input.mode,
        created: plan.counts.created,
        updated: plan.counts.updated,
        unchanged: plan.counts.unchanged,
        deactivated: plan.counts.deactivated,
        skipped: plan.counts.skipped,
        issues: plan.issues as unknown as Prisma.InputJsonArray,
      },
    });

    if (plan.creates.length > 0) {
      await tx.user.createMany({
        data: plan.creates.map((row) => ({
          username: row.username,
          email: row.email,
          firstName: row.firstName,
          lastName: row.lastName,
          classStanding: row.classStanding,
          onRoster: true,
          lastImportId: record.id,
        })),
      });
    }

    // Rows with identical changes (e.g. a whole class moving up a year) share one UPDATE.
    for (const { ids, data } of groupUpdates(plan.updates)) {
      await tx.user.updateMany({ where: { id: { in: ids } }, data: { ...data, lastImportId: record.id } });
    }

    if (plan.deactivateIds.length > 0) {
      await tx.user.updateMany({
        where: { id: { in: plan.deactivateIds } },
        data: { onRoster: false, lastImportId: record.id },
      });
    }

    await recordAudit(tx, {
      actorId: input.actorId,
      action: "ROSTER_IMPORTED",
      entityType: "StudentImport",
      entityId: record.id,
      metadata: { mode: input.mode, fileName: input.fileName, counts: { ...plan.counts } },
    });

    return record.id;
  }, TRANSACTION_OPTIONS);

  return getImportSummary(importId);
}

// ---------------------------------------------------------------------------
// Diff
// ---------------------------------------------------------------------------

async function buildPlan(
  db: DbClient,
  rows: RosterRow[],
  parseIssues: RosterIssue[],
  mode: ImportMode,
): Promise<ImportPlan> {
  // Rosters are a few thousand lines; one query for every account is cheaper
  // than per-row lookups and gives us the email index for collision checks.
  const existing: ExistingUser[] = await db.user.findMany({
    select: {
      id: true,
      username: true,
      email: true,
      firstName: true,
      lastName: true,
      classStanding: true,
      onRoster: true,
      platformRole: true,
    },
  });
  const byUsername = new Map(existing.map((u) => [u.username.toLowerCase(), u]));
  const byEmail = new Map(existing.map((u) => [u.email.toLowerCase(), u]));

  let issues = [...parseIssues];
  const collisionLines = new Set<number>();
  const skippedLines = new Set(parseIssues.filter((i) => i.severity === "ERROR").map((i) => i.line));
  const creates: RosterRow[] = [];
  const updates: ImportPlan["updates"] = [];
  const inFile = new Set<string>();
  let unchanged = 0;

  for (const row of rows) {
    const emailOwner = byEmail.get(row.email);
    if (emailOwner && emailOwner.username.toLowerCase() !== row.username) {
      issues.push({
        line: row.line,
        username: row.username,
        severity: "ERROR",
        message: `Email already belongs to another account (@${emailOwner.username})`,
      });
      skippedLines.add(row.line);
      collisionLines.add(row.line);
      continue;
    }

    inFile.add(row.username);
    const user = byUsername.get(row.username);
    if (!user) {
      creates.push(row);
      continue;
    }

    const data: UserChanges = {};
    if (user.firstName !== row.firstName) data.firstName = row.firstName;
    if (user.lastName !== row.lastName) data.lastName = row.lastName;
    if (user.email !== row.email) data.email = row.email;
    if (user.classStanding !== row.classStanding) data.classStanding = row.classStanding;
    if (!user.onRoster) data.onRoster = true;

    if (Object.keys(data).length > 0) updates.push({ id: user.id, data });
    else unchanged++;
  }

  const onRosterStudents = existing.filter((u) => u.onRoster && u.platformRole === "STUDENT");
  // Platform admins are never taken off the roster by a sync; nobody is ever deleted.
  const deactivateIds =
    mode === "FULL_SYNC" ? onRosterStudents.filter((u) => !inFile.has(u.username.toLowerCase())).map((u) => u.id) : [];

  // Warnings on a row that is skipped anyway are noise.
  if (collisionLines.size > 0) {
    issues = issues.filter((i) => i.severity === "ERROR" || !collisionLines.has(i.line));
  }
  issues.sort((a, b) => a.line - b.line);

  return {
    creates,
    updates,
    unchanged,
    deactivateIds,
    onRosterStudents: onRosterStudents.length,
    issues,
    counts: {
      valid: creates.length + updates.length + unchanged,
      created: creates.length,
      updated: updates.length,
      unchanged,
      deactivated: deactivateIds.length,
      skipped: skippedLines.size,
      warnings: issues.filter((i) => i.severity === "WARNING").length,
    },
  };
}

function groupUpdates(updates: ImportPlan["updates"]): { ids: string[]; data: UserChanges }[] {
  const groups = new Map<string, { ids: string[]; data: UserChanges }>();
  for (const { id, data } of updates) {
    const key = JSON.stringify(data);
    const group = groups.get(key);
    if (group) group.ids.push(id);
    else groups.set(key, { ids: [id], data });
  }
  return [...groups.values()];
}

const MAX_ISSUES_IN_ERROR = 200;

function assertNotEmpty(plan: ImportPlan) {
  if (plan.counts.valid > 0) return;
  throw new AppError(400, "IMPORT_EMPTY", "The file contains no valid roster rows, so nothing was imported.", {
    issues: plan.issues.slice(0, MAX_ISSUES_IN_ERROR),
  });
}

function assertNotTooDestructive(plan: ImportPlan, confirmed: boolean) {
  const { deactivated } = plan.counts;
  if (confirmed || deactivated === 0) return;
  if (deactivated <= plan.onRosterStudents * DESTRUCTIVE_SYNC_RATIO) return;
  throw new AppError(
    400,
    "IMPORT_SYNC_TOO_DESTRUCTIVE",
    `This full sync would take ${deactivated} of ${plan.onRosterStudents} students off the roster. ` +
      `Check the file, or confirm to proceed.`,
    { deactivated, onRoster: plan.onRosterStudents, thresholdRatio: DESTRUCTIVE_SYNC_RATIO },
  );
}

async function hasOpenElection(now = new Date()): Promise<boolean> {
  const open = await prisma.election.count({
    where: { status: "PUBLISHED", startsAt: { lte: now }, endsAt: { gt: now }, closedAt: null },
  });
  return open > 0;
}

// ---------------------------------------------------------------------------
// History
// ---------------------------------------------------------------------------

type ImportRecord = StudentImport & { uploadedBy: { username: string } | null };

const withUploader = { uploadedBy: { select: { username: true } } } as const;

function storedIssues(record: StudentImport): RosterIssue[] {
  return Array.isArray(record.issues) ? (record.issues as unknown as RosterIssue[]) : [];
}

function storedCounts(record: StudentImport, issues: RosterIssue[]): ImportCounts {
  return {
    valid: record.created + record.updated + record.unchanged,
    created: record.created,
    updated: record.updated,
    unchanged: record.unchanged,
    deactivated: record.deactivated,
    skipped: record.skipped,
    warnings: issues.filter((i) => i.severity === "WARNING").length,
  };
}

export async function getImportSummary(id: string): Promise<ImportSummary> {
  const record: ImportRecord | null = await prisma.studentImport.findUnique({ where: { id }, include: withUploader });
  if (!record) throw AppError.notFound("Import not found");
  const issues = storedIssues(record);
  return {
    id: record.id,
    dryRun: false,
    mode: record.mode,
    fileName: record.fileName,
    counts: storedCounts(record, issues),
    issues,
    openElectionWarning: await hasOpenElection(),
    createdAt: record.createdAt.toISOString(),
    uploadedBy: record.uploadedBy?.username ?? null,
  };
}

const HISTORY_LIMIT = 50;

export async function listImports(): Promise<ImportHistoryItem[]> {
  const records: ImportRecord[] = await prisma.studentImport.findMany({
    orderBy: { createdAt: "desc" },
    take: HISTORY_LIMIT,
    include: withUploader,
  });
  return records.map((record) => {
    const issues = storedIssues(record);
    return {
      id: record.id,
      fileName: record.fileName,
      mode: record.mode,
      counts: storedCounts(record, issues),
      issueCount: issues.length,
      uploadedBy: record.uploadedBy?.username ?? null,
      createdAt: record.createdAt.toISOString(),
    };
  });
}
