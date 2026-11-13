import {
  positionInputSchema,
  type AdminElectionSummary,
  type AdminPosition,
  type ClassStanding,
  type ElectionPhase,
  type EligibilityRule,
  type PositionInput,
  type VoterListSummary,
  type VotingMethod,
} from "@asa/shared";
import { getErrorMessage, isApiError } from "../api/client";
import { fieldErrorsFromIssues, type FieldErrors } from "./formErrors";
import { classStandingPlural, joinList } from "./labels";

// ---------- List filters ----------

export const ADMIN_PHASE_FILTERS = [
  { id: "all", label: "All" },
  { id: "draft", label: "Drafts" },
  { id: "upcoming", label: "Upcoming" },
  { id: "open", label: "Open" },
  { id: "closed", label: "Closed" },
] as const;
export type AdminPhaseFilter = (typeof ADMIN_PHASE_FILTERS)[number]["id"];
export const ADMIN_PHASE_FILTER_IDS: AdminPhaseFilter[] = ADMIN_PHASE_FILTERS.map((f) => f.id);

/** "Closed" also holds cancelled elections; "All" holds everything. */
export function matchesPhaseFilter(phase: ElectionPhase, filter: AdminPhaseFilter): boolean {
  if (filter === "all") return true;
  if (filter === "closed") return phase === "closed" || phase === "cancelled";
  return phase === filter;
}

const PHASE_ORDER: Record<ElectionPhase, number> = { open: 0, upcoming: 1, draft: 2, closed: 3, cancelled: 4 };

/** Open first, then upcoming, drafts, closed, cancelled; soonest start first within a phase. */
export function sortAdminElections(items: AdminElectionSummary[]): AdminElectionSummary[] {
  return [...items].sort(
    (a, b) => PHASE_ORDER[a.phase] - PHASE_ORDER[b.phase] || Date.parse(a.startsAt) - Date.parse(b.startsAt),
  );
}

export const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString()} ${n === 1 ? one : many}`;

/** "3 positions · 7 candidates" */
export function structureSummary(e: Pick<AdminElectionSummary, "positionCount" | "candidateCount">): string {
  return `${plural(e.positionCount, "position")} · ${plural(e.candidateCount, "candidate")}`;
}

/** "2 open · 1 draft" for the dashboard; null when there's nothing worth showing. */
export function dashboardElectionCounts(items: AdminElectionSummary[] | undefined): string | null {
  if (!items) return null;
  const count = (p: ElectionPhase) => items.filter((e) => e.phase === p).length;
  const parts: string[] = [];
  if (count("open")) parts.push(`${count("open")} open`);
  if (count("upcoming")) parts.push(`${count("upcoming")} upcoming`);
  if (count("draft")) parts.push(plural(count("draft"), "draft"));
  if (parts.length) return parts.join(" · ");
  return items.length ? plural(items.length, "election") : null;
}

// ---------- Lifecycle actions ----------

export type ElectionActionId = "publish" | "deleteDraft" | "unpublish" | "cancel" | "close" | "duplicate" | "viewPublic";

/** Actions offered in the editor header for each phase, in display order. */
export function actionsForPhase(phase: ElectionPhase): ElectionActionId[] {
  switch (phase) {
    case "draft":
      return ["publish", "deleteDraft", "duplicate"];
    case "upcoming":
      return ["unpublish", "cancel", "duplicate", "viewPublic"];
    case "open":
      return ["close", "cancel", "duplicate", "viewPublic"];
    case "closed":
    case "cancelled":
      return ["duplicate", "viewPublic"];
  }
}

export const LOCK_MESSAGE =
  "Voting has started — positions, candidates, eligibility and dates are locked to protect the election.";

/** Title, description and results settings can still change (not closed or cancelled). */
export const isEditablePhase = (phase: ElectionPhase) => phase === "draft" || phase === "upcoming" || phase === "open";

// ---------- Errors ----------

const ERROR_COPY: Record<string, { title: string; message: string }> = {
  ELECTION_LOCKED: {
    title: "Voting has started",
    message:
      "Positions, candidates, eligibility and dates are locked once an election opens. The page has been refreshed.",
  },
  NOT_A_DRAFT: {
    title: "This election is no longer a draft",
    message: "Only drafts can be published or deleted. The page has been refreshed.",
  },
  INVALID_ELECTION_STATE: {
    title: "The election has changed",
    message: "That action isn't available in the election's current state. The page has been refreshed.",
  },
  INVALID_ORDER: {
    title: "The order couldn't be saved",
    message: "The list changed while you were reordering. The page has been refreshed; try again.",
  },
  PUBLISH_BLOCKED: {
    title: "This election isn't ready to publish",
    message: "Fix the items in the checklist, then try again.",
  },
  INVALID_VOTER_LIST: {
    title: "Choose a different voter list",
    message: "That voter list doesn't belong to this election's organization or no longer exists.",
  },
  VOTER_LIST_IN_USE: {
    title: "This list is in use",
    message: "An election or position still uses this voter list. Change their eligibility first, then delete it.",
  },
};

/** Friendly title + message for a failed admin mutation. */
export function describeAdminError(
  error: unknown,
  fallbackTitle = "That didn't go through",
): { title: string; message: string } {
  if (isApiError(error) && ERROR_COPY[error.code]) return ERROR_COPY[error.code];
  if (isApiError(error, 403)) {
    return { title: "You don't have permission", message: "You can only manage your own organization's elections." };
  }
  if (isApiError(error, 404)) return { title: "Not found", message: "It may have been deleted. Refresh and try again." };
  return { title: fallbackTitle, message: getErrorMessage(error) };
}

/** Friendlier wording than zod defaults for the election form fields. */
export const ELECTION_FRIENDLY_ERRORS = {
  organizationId: "Choose an organization.",
  title: "Enter a title between 3 and 150 characters.",
  description: "Keep the description under 4,000 characters.",
  startsAt: "Enter when voting opens.",
  endsAt: "Enter when voting closes.",
  eligibility: "Choose who can vote.",
};

// ---------- Eligibility ----------

/** Problem with an incomplete rule (empty class list / no list chosen), else null. */
export function eligibilityProblem(rule: EligibilityRule): string | null {
  if (rule.type === "CLASS_STANDING" && rule.classes.length === 0) return "Choose at least one class year.";
  if (rule.type === "VOTER_LIST" && !rule.listId) return "Choose a voter list.";
  return null;
}

export const CLASS_ORDER: ClassStanding[] = ["FR", "SO", "JR", "SR", "GR"];
export const UNDERGRAD_CLASSES: ClassStanding[] = ["FR", "SO", "JR", "SR"];

/** Plain-language sentence for a rule, naming the voter list when known. */
export function eligibilitySentence(
  rule: EligibilityRule,
  lists: ReadonlyArray<Pick<VoterListSummary, "id" | "name">> = [],
): string {
  switch (rule.type) {
    case "ALL_STUDENTS":
      return "All students on the current roster can vote.";
    case "CLASS_STANDING": {
      if (rule.classes.length === 0) return "Choose at least one class year.";
      const sorted = CLASS_ORDER.filter((c) => rule.classes.includes(c));
      if (sorted.length === 5) return "All undergraduate and graduate students on the roster can vote.";
      if (sorted.length === 4 && !sorted.includes("GR")) return "Only undergraduates (Freshmen through Seniors) can vote.";
      return `Only ${joinList(sorted.map(classStandingPlural))} can vote.`;
    }
    case "VOTER_LIST": {
      if (!rule.listId) return "Choose a voter list.";
      const list = lists.find((l) => l.id === rule.listId);
      return list
        ? `Only students on the “${list.name}” list can vote.`
        : "Only students on the chosen voter list can vote.";
    }
  }
}

// ---------- Positions ----------

export interface PositionFormValues {
  title: string;
  description: string;
  votingMethod: VotingMethod;
  seats: string;
  maxSelections: string;
  allowAbstain: boolean;
  allowWriteIn: boolean;
  eligibility: EligibilityRule;
}

export function positionFormFrom(position?: AdminPosition): PositionFormValues {
  if (!position) {
    return {
      title: "",
      description: "",
      votingMethod: "SINGLE_CHOICE",
      seats: "1",
      maxSelections: "1",
      allowAbstain: true,
      allowWriteIn: false,
      eligibility: { type: "ALL_STUDENTS" },
    };
  }
  return {
    title: position.title,
    description: position.description ?? "",
    votingMethod: position.votingMethod,
    seats: String(position.seats),
    maxSelections: String(position.maxSelections),
    allowAbstain: position.allowAbstain,
    allowWriteIn: position.allowWriteIn,
    eligibility: position.eligibility,
  };
}

const POSITION_FRIENDLY = {
  title: "Enter a title between 2 and 120 characters.",
  description: "Keep the description under 2,000 characters.",
  seats: "Seats must be a whole number from 1 to 20.",
  maxSelections: "Choose a whole number from 1 to 20.",
};

const toInt = (v: string) => (/^\s*\d+\s*$/.test(v) ? Number(v) : NaN);

/** Validates the position form with the shared zod schema. Single choice always sends maxSelections 1. */
export function validatePositionForm(
  values: PositionFormValues,
): { ok: true; data: PositionInput } | { ok: false; errors: FieldErrors } {
  const seats = toInt(values.seats);
  const maxSelections = values.votingMethod === "SINGLE_CHOICE" ? 1 : toInt(values.maxSelections);
  const result = positionInputSchema.safeParse({
    title: values.title,
    description: values.description.trim() || null,
    seats,
    votingMethod: values.votingMethod,
    maxSelections,
    allowAbstain: values.allowAbstain,
    allowWriteIn: values.allowWriteIn,
    eligibility: values.eligibility,
  });
  const errors: FieldErrors = result.success ? {} : fieldErrorsFromIssues(result.error.issues, POSITION_FRIENDLY);
  const ruleProblem = eligibilityProblem(values.eligibility);
  if (ruleProblem) errors.eligibility = ruleProblem;
  if (!result.success || ruleProblem) return { ok: false, errors };
  return { ok: true, data: result.data };
}

/** "1 seat · Choose 1" / "3 seats · Choose up to 3" */
export function positionRulesLabel(p: Pick<AdminPosition, "seats" | "votingMethod" | "maxSelections">): string {
  const choose =
    p.votingMethod === "SINGLE_CHOICE" || p.maxSelections <= 1 ? "Choose 1" : `Choose up to ${p.maxSelections}`;
  return `${plural(p.seats, "seat")} · ${choose}`;
}

// ---------- ASA class senator template ----------

export const CLASS_SENATOR_TEMPLATE: Array<{ title: string; cls: ClassStanding }> = [
  { title: "Freshman Senator", cls: "FR" },
  { title: "Sophomore Senator", cls: "SO" },
  { title: "Junior Senator", cls: "JR" },
  { title: "Senior Senator", cls: "SR" },
];

export function classSenatorInputs(): PositionInput[] {
  return CLASS_SENATOR_TEMPLATE.map(({ title, cls }) => ({
    title,
    description: null,
    seats: 1,
    votingMethod: "SINGLE_CHOICE",
    maxSelections: 1,
    allowAbstain: true,
    allowWriteIn: false,
    eligibility: { type: "CLASS_STANDING", classes: [cls] },
  }));
}

/** Offer the template only when none of the senator titles exist yet. */
export function canAddClassSenators(positions: ReadonlyArray<Pick<AdminPosition, "title">>): boolean {
  const titles = new Set(positions.map((p) => p.title.trim().toLowerCase()));
  return CLASS_SENATOR_TEMPLATE.every((t) => !titles.has(t.title.toLowerCase()));
}

/** Swaps the item at `index` with its neighbour; null when that would leave the list. */
export function moveId(ids: string[], index: number, delta: -1 | 1): string[] | null {
  const target = index + delta;
  if (index < 0 || index >= ids.length || target < 0 || target >= ids.length) return null;
  const next = [...ids];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

// ---------- Voter list members ----------

/**
 * Usernames from a textarea: one per line or comma/semicolon/space separated.
 * Trims, lowercases, turns emails into usernames (the part before "@") and removes duplicates.
 */
export function parseUsernames(text: string): string[] {
  const seen = new Set<string>();
  for (const raw of text.split(/[\s,;]+/)) {
    const value = raw.trim().toLowerCase();
    const username = value.includes("@") ? value.split("@")[0] : value;
    if (username) seen.add(username);
  }
  return [...seen];
}
