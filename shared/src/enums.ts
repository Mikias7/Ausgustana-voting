/**
 * Enum-like constants shared by client and server.
 * Kept as `as const` arrays so they can drive both TypeScript types and zod schemas.
 * Values must match the Prisma enums in server/prisma/schema.prisma.
 */

export const CLASS_STANDINGS = ["FR", "SO", "JR", "SR"] as const;
export type ClassStanding = (typeof CLASS_STANDINGS)[number];

export const CLASS_STANDING_LABELS: Record<ClassStanding, string> = {
  FR: "Freshman",
  SO: "Sophomore",
  JR: "Junior",
  SR: "Senior",
};

export const PLATFORM_ROLES = ["STUDENT", "PLATFORM_ADMIN"] as const;
export type PlatformRole = (typeof PLATFORM_ROLES)[number];

export const ORG_ROLES = ["ORG_ADMIN", "ELECTION_ADMIN"] as const;
export type OrgRole = (typeof ORG_ROLES)[number];

export const ELECTION_STATUSES = ["DRAFT", "PUBLISHED", "CANCELLED"] as const;
export type ElectionStatus = (typeof ELECTION_STATUSES)[number];

/** Derived from status + dates; never stored. See getElectionPhase(). */
export const ELECTION_PHASES = ["draft", "upcoming", "open", "closed", "cancelled"] as const;
export type ElectionPhase = (typeof ELECTION_PHASES)[number];

export const VOTING_METHODS = ["SINGLE_CHOICE", "MULTIPLE_CHOICE"] as const;
export type VotingMethod = (typeof VOTING_METHODS)[number];

export const RESULTS_VISIBILITIES = ["PUBLIC", "STUDENTS", "ADMINS_ONLY"] as const;
export type ResultsVisibility = (typeof RESULTS_VISIBILITIES)[number];

export const RESULTS_RELEASES = ["AUTOMATIC", "MANUAL"] as const;
export type ResultsRelease = (typeof RESULTS_RELEASES)[number];

export const IMPORT_MODES = ["MERGE", "FULL_SYNC"] as const;
export type ImportMode = (typeof IMPORT_MODES)[number];
