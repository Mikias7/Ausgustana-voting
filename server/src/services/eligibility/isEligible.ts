import {
  CLASS_STANDINGS,
  UNDERGRAD_CLASS_STANDINGS,
  eligibilityRuleSchema,
  type ClassStanding,
  type EligibilityRule,
} from "@asa/shared";

/** The facts about a voter that eligibility depends on. */
export interface VoterFacts {
  onRoster: boolean;
  classStanding: ClassStanding | null;
  username: string;
}

/** Data that would otherwise need a DB lookup, supplied by the caller to keep isEligible pure. */
export interface EligibilityContext {
  /** IDs of the voter lists this voter's username belongs to. */
  voterListIds: ReadonlySet<string>;
}

/**
 * THE eligibility check. Nothing else in the codebase inspects class standing
 * or voter lists. Students not on the active roster are never eligible.
 */
export function isEligible(voter: VoterFacts, rule: EligibilityRule, ctx: EligibilityContext): boolean {
  if (!voter.onRoster) return false;

  switch (rule.type) {
    case "ALL_STUDENTS":
      return true;
    case "CLASS_STANDING":
      return voter.classStanding !== null && rule.classes.includes(voter.classStanding);
    case "VOTER_LIST":
      return ctx.voterListIds.has(rule.listId);
    default: {
      // Compile-time exhaustiveness check; unknown rules fail closed at runtime.
      const unknownRule: never = rule;
      void unknownRule;
      return false;
    }
  }
}

/** Parses a rule stored as JSON. Returns null for malformed data (callers fail closed). */
export function parseStoredRule(value: unknown): EligibilityRule | null {
  const result = eligibilityRuleSchema.safeParse(value);
  return result.success ? result.data : null;
}

const PLURAL_LABELS: Record<ClassStanding, string> = {
  FR: "Freshmen",
  SO: "Sophomores",
  JR: "Juniors",
  SR: "Seniors",
  GR: "Graduate students",
};

/**
 * Human-readable description, e.g. "Open to Seniors only",
 * "Open to Juniors and Seniors", "Open to all students".
 */
export function describeRule(rule: EligibilityRule, voterListName?: string): string {
  switch (rule.type) {
    case "ALL_STUDENTS":
      return "Open to all students";
    case "CLASS_STANDING": {
      // Keep FR→SR order regardless of how the rule lists classes.
      const classes = CLASS_STANDINGS.filter((c) => rule.classes.includes(c));
      if (classes.length === CLASS_STANDINGS.length) return "Open to all class years";
      if (classes.length === UNDERGRAD_CLASS_STANDINGS.length && UNDERGRAD_CLASS_STANDINGS.every((c) => classes.includes(c)))
        return "Open to undergraduates";
      const labels = classes.map((c) => PLURAL_LABELS[c]);
      if (labels.length === 1) return `Open to ${labels[0]} only`;
      return `Open to ${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
    }
    case "VOTER_LIST":
      return voterListName ? `Open to students on the "${voterListName}" list` : "Open to a specific list of students";
    default:
      return "Eligibility rule not recognised";
  }
}
