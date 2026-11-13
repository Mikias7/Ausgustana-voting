import { describe, expect, it } from "vitest";
import type { AuthUser } from "../services/auth/currentUser";
import { canViewResults } from "../services/results.policy";
import { generateReceiptCode, hashReceiptCode } from "../utils/receipt";

const NOW = new Date("2026-11-13T12:00:00Z");
const ORG = "org-1";

const closed = {
  organizationId: ORG,
  status: "PUBLISHED" as const,
  startsAt: new Date("2026-11-01T00:00:00Z"),
  endsAt: new Date("2026-11-05T00:00:00Z"),
  closedAt: null,
  resultsRelease: "MANUAL" as const,
  resultsPublishedAt: new Date("2026-11-06T00:00:00Z"),
  resultsVisibility: "PUBLIC" as const,
};

const user = (overrides: Partial<AuthUser> = {}) =>
  ({ id: "u1", platformRole: "STUDENT", orgRoles: [], ...overrides }) as unknown as AuthUser;
const orgAdmin = user({ orgRoles: [{ organizationId: ORG, userId: "u1", role: "ELECTION_ADMIN" }] as AuthUser["orgRoles"] });

describe("canViewResults", () => {
  it("is false for anyone before the election closes", () => {
    const open = { ...closed, endsAt: new Date("2026-11-20T00:00:00Z") };
    expect(canViewResults(open, undefined, NOW)).toBe(false);
    expect(canViewResults(open, orgAdmin, NOW)).toBe(false);
  });

  it("PUBLIC + released is visible to everyone", () => {
    expect(canViewResults(closed, undefined, NOW)).toBe(true);
  });

  it("STUDENTS requires sign-in", () => {
    const students = { ...closed, resultsVisibility: "STUDENTS" as const };
    expect(canViewResults(students, undefined, NOW)).toBe(false);
    expect(canViewResults(students, user(), NOW)).toBe(true);
  });

  it("MANUAL release hides results until published, except from org admins", () => {
    const unpublished = { ...closed, resultsPublishedAt: null };
    expect(canViewResults(unpublished, user(), NOW)).toBe(false);
    expect(canViewResults(unpublished, orgAdmin, NOW)).toBe(true);
    expect(canViewResults(unpublished, user({ platformRole: "PLATFORM_ADMIN" }), NOW)).toBe(true);
  });

  it("AUTOMATIC release shows results as soon as the election closes", () => {
    expect(canViewResults({ ...closed, resultsRelease: "AUTOMATIC", resultsPublishedAt: null }, undefined, NOW)).toBe(true);
  });

  it("ADMINS_ONLY is never visible to students", () => {
    const adminsOnly = { ...closed, resultsVisibility: "ADMINS_ONLY" as const };
    expect(canViewResults(adminsOnly, user(), NOW)).toBe(false);
    expect(canViewResults(adminsOnly, orgAdmin, NOW)).toBe(true);
  });
});

describe("receipt codes", () => {
  it("are formatted XXXX-XXXX-XXXX and unique", () => {
    const codes = new Set(Array.from({ length: 200 }, generateReceiptCode));
    expect(codes.size).toBe(200);
    for (const code of codes) expect(code).toMatch(/^[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}$/);
  });

  it("hash case- and whitespace-insensitively", () => {
    expect(hashReceiptCode(" abcd-efgh-jkmn ")).toBe(hashReceiptCode("ABCD-EFGH-JKMN"));
    expect(hashReceiptCode("ABCD-EFGH-JKMN")).toMatch(/^[0-9a-f]{64}$/);
  });
});
