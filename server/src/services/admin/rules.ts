import type { Prisma } from "@prisma/client";
import type { AdminCandidate, AdminPosition, EligibilityRule } from "@asa/shared";
import { AppError } from "../../utils/AppError";
import type { DbClient } from "../audit.service";
import { describeRule, parseStoredRule } from "../eligibility";

/** Eligibility rule → Prisma JSON column value. */
export const ruleJson = (rule: EligibilityRule) => rule as unknown as Prisma.InputJsonObject;

/** Voter-list ids referenced by these (stored or parsed) rules. */
export function listIdsOf(rules: unknown[]): string[] {
  const ids = new Set<string>();
  for (const raw of rules) {
    const rule = parseStoredRule(raw);
    if (rule?.type === "VOTER_LIST") ids.add(rule.listId);
  }
  return [...ids];
}

export interface ListInfo {
  id: string;
  name: string;
  organizationId: string;
  memberCount: number;
}

export async function loadLists(db: DbClient, ids: string[]): Promise<Map<string, ListInfo>> {
  if (ids.length === 0) return new Map();
  const lists = await db.voterList.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, organizationId: true, _count: { select: { members: true } } },
  });
  return new Map(
    lists.map((l) => [l.id, { id: l.id, name: l.name, organizationId: l.organizationId, memberCount: l._count.members }]),
  );
}

/**
 * Write-time check: every VOTER_LIST rule must point to an existing list of
 * the election's organization (400 INVALID_VOTER_LIST).
 */
export async function assertValidRules(db: DbClient, organizationId: string, rules: EligibilityRule[]): Promise<void> {
  const ids = listIdsOf(rules);
  if (ids.length === 0) return;
  const lists = await loadLists(db, ids);
  for (const id of ids) {
    const list = lists.get(id);
    if (!list || list.organizationId !== organizationId) {
      throw new AppError(400, "INVALID_VOTER_LIST", "The selected voter list does not exist in this organization", {
        listId: id,
      });
    }
  }
}

/** Human-readable rule text; uses the voter list's name when known. */
export function describeStoredRule(raw: unknown, lists: Map<string, ListInfo>): string {
  const rule = parseStoredRule(raw);
  if (!rule) return "Eligibility rule not recognised";
  return describeRule(rule, rule.type === "VOTER_LIST" ? lists.get(rule.listId)?.name : undefined);
}

/** Parsed stored rule; malformed data is returned as stored so admins can see (and replace) it. */
export function storedRule(raw: unknown): EligibilityRule {
  return (parseStoredRule(raw) ?? raw) as EligibilityRule;
}

type CandidateRow = { id: string; name: string; bio: string | null; photoUrl: string | null; sortOrder: number };
type PositionRow = {
  id: string;
  title: string;
  description: string | null;
  seats: number;
  votingMethod: AdminPosition["votingMethod"];
  maxSelections: number;
  allowAbstain: boolean;
  allowWriteIn: boolean;
  eligibility: unknown;
  sortOrder: number;
  candidates: CandidateRow[];
};

export function toAdminCandidate(c: CandidateRow): AdminCandidate {
  return { id: c.id, name: c.name, bio: c.bio, photoUrl: c.photoUrl, sortOrder: c.sortOrder };
}

export function toAdminPosition(p: PositionRow, lists: Map<string, ListInfo>): AdminPosition {
  return {
    id: p.id,
    title: p.title,
    description: p.description,
    seats: p.seats,
    votingMethod: p.votingMethod,
    maxSelections: p.maxSelections,
    allowAbstain: p.allowAbstain,
    allowWriteIn: p.allowWriteIn,
    eligibility: storedRule(p.eligibility),
    eligibilityText: describeStoredRule(p.eligibility, lists),
    sortOrder: p.sortOrder,
    candidates: p.candidates.map(toAdminCandidate),
  };
}

/** Order-insensitive deep equality for small JSON values (rules). */
export function jsonEqual(a: unknown, b: unknown): boolean {
  return stableStringify(a) === stableStringify(b);
}

function stableStringify(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(",")}]`;
  if (v && typeof v === "object") {
    const entries = Object.entries(v as Record<string, unknown>)
      .filter(([, x]) => x !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : 1));
    return `{${entries.map(([k, x]) => `${JSON.stringify(k)}:${stableStringify(x)}`).join(",")}}`;
  }
  return JSON.stringify(v ?? null);
}
