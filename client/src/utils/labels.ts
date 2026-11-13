import {
  CLASS_STANDING_LABELS,
  type ClassStanding,
  type EligibilityRule,
  type OrgRole,
  type PlatformRole,
  type VotingMethod,
} from "@asa/shared";

const CLASS_STANDING_PLURALS: Record<ClassStanding, string> = {
  FR: "Freshmen",
  SO: "Sophomores",
  JR: "Juniors",
  SR: "Seniors",
  GR: "Graduate students",
};

export function classStandingLabel(value: ClassStanding | null | undefined): string {
  return value ? CLASS_STANDING_LABELS[value] : "Not set";
}

export function classStandingPlural(value: ClassStanding): string {
  return CLASS_STANDING_PLURALS[value];
}

export function platformRoleLabel(role: PlatformRole): string {
  return role === "PLATFORM_ADMIN" ? "Platform administrator" : "Student";
}

export function orgRoleLabel(role: OrgRole): string {
  return role === "ORG_ADMIN" ? "Organization admin" : "Election admin";
}

/** "Freshmen, Sophomores and Juniors" */
export function joinList(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/** Plain-language description of who may vote under a rule. */
export function describeEligibilityRule(rule: EligibilityRule): string {
  switch (rule.type) {
    case "ALL_STUDENTS":
      return "Open to all students on the current roster";
    case "CLASS_STANDING":
      return `Open to ${joinList(rule.classes.map(classStandingPlural))}`;
    case "VOTER_LIST":
      return "Open to students on a specific voter list";
  }
}

/** Short label for a position's ballot format, e.g. "Choose 1" / "Choose up to 3". */
export function votingMethodLabel(method: VotingMethod, maxSelections: number): string {
  if (method === "SINGLE_CHOICE" || maxSelections <= 1) return "Choose 1";
  return `Choose up to ${maxSelections}`;
}
