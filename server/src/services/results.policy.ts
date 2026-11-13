import type { Election } from "@prisma/client";
import { getElectionPhase } from "@asa/shared";
import { canAdministerOrg, type AuthUser } from "./auth/currentUser";

type ResultsFields = Pick<
  Election,
  | "organizationId"
  | "status"
  | "startsAt"
  | "endsAt"
  | "closedAt"
  | "resultsRelease"
  | "resultsPublishedAt"
  | "resultsVisibility"
>;

/**
 * Whether `viewer` may see results right now. Results never exist before the
 * election closes. Admins of the organization may see them as soon as it
 * closes (to review before a manual release); everyone else needs the results
 * to be released AND the visibility setting to include them.
 */
export function canViewResults(election: ResultsFields, viewer: AuthUser | undefined, now = new Date()): boolean {
  if (getElectionPhase(election, now) !== "closed") return false;
  if (canAdministerOrg(viewer, election.organizationId)) return true;

  const released = election.resultsRelease === "AUTOMATIC" || election.resultsPublishedAt !== null;
  if (!released) return false;

  switch (election.resultsVisibility) {
    case "PUBLIC":
      return true;
    case "STUDENTS":
      return viewer !== undefined;
    case "ADMINS_ONLY":
      return false;
  }
}
