/**
 * Roster import against a real PostgreSQL test database (TEST_DATABASE_URL).
 * Run with `npm run test:int`.
 */
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import type { ImportSummary } from "@asa/shared";
import { prisma } from "../utils/prisma";
import {
  ADMIN_ID,
  makeApp,
  resetWithBaseUsers,
  roster,
  rosterLine as line,
  signedInAgent,
  STUDENT_ID,
} from "./integration/helpers";

const app = makeApp();
let admin: Awaited<ReturnType<typeof signedInAgent>>;
let student: Awaited<ReturnType<typeof signedInAgent>>;

beforeAll(async () => {
  await resetWithBaseUsers();
  admin = await signedInAgent(app, "admin");
  student = await signedInAgent(app, "viewer");
});

beforeEach(resetWithBaseUsers);

interface UploadOptions {
  dryRun?: boolean;
  mode?: "MERGE" | "FULL_SYNC";
  confirmDestructive?: boolean;
  filename?: string;
  contentType?: string;
}

function upload(content: string | Buffer, opts: UploadOptions = {}, agent = admin) {
  let req = agent
    .post(`/api/admin/imports?dryRun=${opts.dryRun ?? false}`)
    .set("X-Requested-With", "fetch")
    .field("mode", opts.mode ?? "MERGE");
  if (opts.confirmDestructive !== undefined) req = req.field("confirmDestructive", String(opts.confirmDestructive));
  return req.attach("file", Buffer.isBuffer(content) ? content : Buffer.from(content, "utf8"), {
    filename: opts.filename ?? "roster.txt",
    contentType: opts.contentType ?? "text/plain",
  });
}

async function commit(content: string, opts: UploadOptions = {}): Promise<ImportSummary> {
  const res = await upload(content, { ...opts, dryRun: false });
  expect(res.status, JSON.stringify(res.body)).toBe(201);
  return res.body as ImportSummary;
}

const studentUser = (username: string, onRoster = true, cls: "FR" | "SO" | "JR" | "SR" | null = "SO") => ({
  username,
  email: `${username}@ole.augie.edu`,
  firstName: `First-${username}`,
  lastName: `Last-${username}`,
  classStanding: cls,
  onRoster,
});

const usernames = async () => (await prisma.user.findMany({ orderBy: { username: "asc" } })).map((u) => u.username);

describe("dry run", () => {
  it("returns a preview and writes nothing", async () => {
    const before = await usernames();
    const res = await upload(roster(line("alice"), line("bob"), line("carol")), { dryRun: true });

    expect(res.status).toBe(200);
    const summary = res.body as ImportSummary;
    expect(summary).toMatchObject({ id: null, dryRun: true, mode: "MERGE", fileName: "roster.txt", createdAt: null });
    expect(summary.counts).toEqual({
      valid: 3,
      created: 3,
      updated: 0,
      unchanged: 0,
      deactivated: 0,
      skipped: 0,
      warnings: 0,
    });

    expect(await usernames()).toEqual(before);
    expect(await prisma.studentImport.count()).toBe(0);
    expect(await prisma.auditLog.count()).toBe(0);
  });

  it("defaults to a dry run when the dryRun flag is omitted", async () => {
    const res = await admin
      .post("/api/admin/imports")
      .set("X-Requested-With", "fetch")
      .attach("file", Buffer.from(roster(line("alice"))), { filename: "r.txt", contentType: "text/plain" });
    expect(res.status).toBe(200);
    expect(res.body.dryRun).toBe(true);
    expect(await prisma.user.count({ where: { username: "alice" } })).toBe(0);
  });

  it("previews a destructive full sync without refusing", async () => {
    await prisma.user.createMany({ data: ["s1", "s2", "s3"].map((u) => studentUser(u)) });
    const res = await upload(roster(line("s1")), { dryRun: true, mode: "FULL_SYNC" });
    expect(res.status).toBe(200);
    expect(res.body.counts.deactivated).toBe(3); // s2, s3, viewer
  });
});

describe("MERGE", () => {
  it("counts created / updated / unchanged on a second import with changes", async () => {
    const first = await commit(roster(line("alice"), line("bob"), line("carol", { cls: "JR" })));
    expect(first.counts).toMatchObject({ valid: 3, created: 3, updated: 0, unchanged: 0 });
    expect(first.id).toEqual(expect.any(String));
    expect(first.dryRun).toBe(false);
    expect(first.uploadedBy).toBe("admin");

    const second = await commit(
      roster(
        line("alice"),
        line("bob", { first: "Robert" }),
        line("carol", { cls: "SR" }),
        line("dave"),
      ),
    );
    expect(second.counts).toEqual({
      valid: 4,
      created: 1,
      updated: 2,
      unchanged: 1,
      deactivated: 0,
      skipped: 0,
      warnings: 0,
    });

    const bob = await prisma.user.findUniqueOrThrow({ where: { username: "bob" } });
    const carol = await prisma.user.findUniqueOrThrow({ where: { username: "carol" } });
    const alice = await prisma.user.findUniqueOrThrow({ where: { username: "alice" } });
    const dave = await prisma.user.findUniqueOrThrow({ where: { username: "dave" } });
    expect(bob.firstName).toBe("Robert");
    expect(carol.classStanding).toBe("SR");
    expect(dave.onRoster).toBe(true);
    // lastImportId marks the import that last changed the account.
    expect(bob.lastImportId).toBe(second.id);
    expect(dave.lastImportId).toBe(second.id);
    expect(alice.lastImportId).toBe(first.id);
    // MERGE never takes anyone off the roster.
    expect((await prisma.user.findUniqueOrThrow({ where: { id: STUDENT_ID } })).onRoster).toBe(true);
  });

  it("maps class code FF to FR and imports an unknown class without one (warning)", async () => {
    const summary = await commit(roster(line("fresh", { cls: "FF" }), line("odd", { cls: "XX" })));
    expect(summary.counts).toMatchObject({ created: 2, skipped: 0, warnings: 1 });
    expect(summary.issues).toEqual([
      { line: 2, username: "odd", severity: "WARNING", message: expect.stringContaining('"XX"') },
    ]);
    expect((await prisma.user.findUniqueOrThrow({ where: { username: "fresh" } })).classStanding).toBe("FR");
    expect((await prisma.user.findUniqueOrThrow({ where: { username: "odd" } })).classStanding).toBeNull();
  });

  it("imports a row whose email does not match the username, without a warning", async () => {
    const summary = await commit(roster(line("jdoe", { email: "john.doe@ole.augie.edu" })));
    expect(summary.counts).toMatchObject({ created: 1, warnings: 0 });
    expect(summary.issues).toEqual([]);
    expect((await prisma.user.findUniqueOrThrow({ where: { username: "jdoe" } })).email).toBe("john.doe@ole.augie.edu");
  });

  it("keeps the first of duplicate usernames and skips the rest", async () => {
    const summary = await commit(roster(line("alice"), line("alice", { first: "Other" }), line("bob")));
    // Same username and email → two errors on line 2, but one skipped row.
    expect(summary.counts).toMatchObject({ valid: 2, created: 2, skipped: 1 });
    expect(summary.issues.every((i) => i.line === 2 && i.severity === "ERROR")).toBe(true);
    expect(summary.issues).toContainEqual({
      line: 2,
      username: "alice",
      severity: "ERROR",
      message: expect.stringMatching(/duplicate username/i),
    });
    expect((await prisma.user.findUniqueOrThrow({ where: { username: "alice" } })).firstName).toBe("First-alice");
  });

  it("skips a row whose email belongs to a different existing account", async () => {
    await prisma.user.create({ data: studentUser("taken") });
    const summary = await commit(roster(line("newbie", { email: "taken@ole.augie.edu" }), line("ok")));

    expect(summary.counts).toMatchObject({ valid: 1, created: 1, skipped: 1, warnings: 0 });
    expect(summary.issues).toEqual([{
      line: 1,
      username: "newbie",
      severity: "ERROR",
      message: "Email already belongs to another account (@taken)",
    }]);
    expect(await prisma.user.count({ where: { username: "newbie" } })).toBe(0);
  });

  it("puts an off-roster student back on the roster", async () => {
    await prisma.user.create({ data: studentUser("returning", false) });
    const summary = await commit(roster(line("returning")));
    expect(summary.counts).toMatchObject({ updated: 1, unchanged: 0 });
    expect((await prisma.user.findUniqueOrThrow({ where: { username: "returning" } })).onRoster).toBe(true);
  });

  it("refuses a file with no valid rows", async () => {
    const res = await upload(roster("only|four|fields|x@ole.augie.edu", "bad|row|u|not-an-email|SO"));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("IMPORT_EMPTY");
    expect(res.body.error.details.issues).toHaveLength(2);
    expect(await prisma.studentImport.count()).toBe(0);
  });
});

describe("FULL_SYNC", () => {
  it("takes absent students off the roster but never deletes them or touches platform admins", async () => {
    await prisma.user.createMany({ data: ["s1", "s2", "s3", "s4"].map((u) => studentUser(u)) });
    const before = await prisma.user.count();

    // On roster: s1..s4 + viewer (5). Absent: s4 and viewer → 2/5, under the 50% guard.
    const summary = await commit(roster(line("s1"), line("s2"), line("s3"), line("s5")), { mode: "FULL_SYNC" });
    expect(summary.counts).toMatchObject({ created: 1, unchanged: 3, deactivated: 2 });

    expect(await prisma.user.count()).toBe(before + 1);
    expect((await prisma.user.findUniqueOrThrow({ where: { username: "s4" } })).onRoster).toBe(false);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: STUDENT_ID } })).onRoster).toBe(false);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: ADMIN_ID } })).onRoster).toBe(true);
  });

  it("refuses to deactivate more than half of on-roster students without confirmDestructive", async () => {
    await prisma.user.createMany({ data: ["s1", "s2", "s3"].map((u) => studentUser(u)) });

    // On roster: s1..s3 + viewer (4). Only s1 in file → 3/4 deactivated.
    const refused = await upload(roster(line("s1"), line("new1")), { mode: "FULL_SYNC" });
    expect(refused.status).toBe(400);
    expect(refused.body.error).toMatchObject({
      code: "IMPORT_SYNC_TOO_DESTRUCTIVE",
      details: { deactivated: 3, onRoster: 4, thresholdRatio: 0.5 },
    });
    expect(await prisma.user.count({ where: { onRoster: true, platformRole: "STUDENT" } })).toBe(4);
    expect(await prisma.user.count({ where: { username: "new1" } })).toBe(0);
    expect(await prisma.studentImport.count()).toBe(0);

    const confirmed = await commit(roster(line("s1"), line("new1")), { mode: "FULL_SYNC", confirmDestructive: true });
    expect(confirmed.counts).toMatchObject({ created: 1, unchanged: 1, deactivated: 3 });
  });

  it("allows deactivating exactly half", async () => {
    await prisma.user.create({ data: studentUser("s1") });
    // On roster: s1 + viewer. Only s1 in file → 1/2.
    const summary = await commit(roster(line("s1")), { mode: "FULL_SYNC" });
    expect(summary.counts.deactivated).toBe(1);
  });
});

describe("records", () => {
  it("writes StudentImport and AuditLog rows on commit only, without roster contents", async () => {
    await upload(roster(line("alice"), line("bob", { cls: "ZZ" })), { dryRun: true });
    expect(await prisma.studentImport.count()).toBe(0);
    expect(await prisma.auditLog.count()).toBe(0);

    const summary = await commit(roster(line("alice"), line("bob", { cls: "ZZ" }), "broken line"), {
      filename: "fall-roster.txt",
    });

    const record = await prisma.studentImport.findUniqueOrThrow({ where: { id: summary.id! } });
    expect(record).toMatchObject({
      fileName: "fall-roster.txt",
      mode: "MERGE",
      created: 2,
      updated: 0,
      unchanged: 0,
      deactivated: 0,
      skipped: 1,
      uploadedById: ADMIN_ID,
    });
    expect(record.issues).toHaveLength(2);

    const audits = await prisma.auditLog.findMany();
    expect(audits).toHaveLength(1);
    expect(audits[0]).toMatchObject({
      action: "ROSTER_IMPORTED",
      entityType: "StudentImport",
      entityId: summary.id,
      actorId: ADMIN_ID,
    });
    expect(Object.keys(audits[0]!.metadata as object).sort()).toEqual(["counts", "fileName", "mode"]);
    expect(JSON.stringify(audits[0]!.metadata)).not.toContain("alice");
  });

  it("lists import history newest first and returns a stored summary", async () => {
    const first = await commit(roster(line("alice")), { filename: "one.txt" });
    const second = await commit(roster(line("alice"), line("bob", { cls: "QQ" })), { filename: "two.csv" });

    const list = await admin.get("/api/admin/imports");
    expect(list.status).toBe(200);
    expect(list.body.map((i: { id: string }) => i.id)).toEqual([second.id, first.id]);
    expect(list.body[0]).toMatchObject({
      fileName: "two.csv",
      mode: "MERGE",
      issueCount: 1,
      uploadedBy: "admin",
      counts: { valid: 2, created: 1, unchanged: 1, warnings: 1 },
    });

    const one = await admin.get(`/api/admin/imports/${second.id}`);
    expect(one.status).toBe(200);
    expect(one.body).toEqual(second);

    expect((await admin.get("/api/admin/imports/00000000-0000-4000-8000-00000000ffff")).status).toBe(404);
    expect((await admin.get("/api/admin/imports/not-a-uuid")).status).toBe(400);
  });

  it("warns when an election is open", async () => {
    const org = await prisma.organization.create({ data: { name: "ASA", slug: "asa" } });
    const now = Date.now();
    await prisma.election.create({
      data: {
        organizationId: org.id,
        title: "Open election",
        startsAt: new Date(now - 60_000),
        endsAt: new Date(now + 3_600_000),
        status: "PUBLISHED",
        eligibility: { type: "ALL_STUDENTS" },
        createdById: ADMIN_ID,
      },
    });
    const res = await upload(roster(line("alice")), { dryRun: true });
    expect(res.body.openElectionWarning).toBe(true);
  });
});

describe("access and upload validation", () => {
  it("returns 401 when signed out and 403 for a non-admin", async () => {
    const anon = await request(app)
      .post("/api/admin/imports?dryRun=true")
      .set("X-Requested-With", "fetch")
      .attach("file", Buffer.from(roster(line("alice"))), { filename: "r.txt", contentType: "text/plain" });
    expect(anon.status).toBe(401);

    expect((await upload(roster(line("alice")), { dryRun: true }, student)).status).toBe(403);
    expect((await student.get("/api/admin/imports")).status).toBe(403);
    expect((await student.get("/api/admin/students")).status).toBe(403);
    expect((await request(app).get("/api/admin/students/stats")).status).toBe(401);
  });

  it("rejects a file over 2 MB with 413", async () => {
    const big = Buffer.alloc(2 * 1024 * 1024 + 1, "a");
    const res = await upload(big, { dryRun: true });
    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe("FILE_TOO_LARGE");
  });

  it("rejects a non-text extension with 400", async () => {
    const res = await upload(roster(line("alice")), { dryRun: true, filename: "roster.pdf", contentType: "application/pdf" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("UNSUPPORTED_FILE_TYPE");
  });

  it("accepts .csv sent as application/octet-stream and strips a UTF-8 BOM", async () => {
    const res = await upload(Buffer.from("﻿" + roster(line("alice")), "utf8"), {
      dryRun: true,
      filename: "roster.csv",
      contentType: "application/octet-stream",
    });
    expect(res.status).toBe(200);
    expect(res.body.counts.created).toBe(1);
  });

  it("rejects a missing file, non-UTF-8 content and an unknown mode", async () => {
    const noFile = await admin.post("/api/admin/imports").set("X-Requested-With", "fetch").field("mode", "MERGE");
    expect(noFile.status).toBe(400);
    expect(noFile.body.error.code).toBe("FILE_REQUIRED");

    const latin1 = await upload(Buffer.from([0x4d, 0xfc, 0x6c, 0x6c, 0x65, 0x72]), { dryRun: true });
    expect(latin1.status).toBe(400);
    expect(latin1.body.error.code).toBe("INVALID_FILE_ENCODING");

    const badMode = await upload(roster(line("alice")), { dryRun: true, mode: "WIPE" as "MERGE" });
    expect(badMode.status).toBe(400);
    expect(badMode.body.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("scale", () => {
  it("imports and then fully updates a 3,000-line roster", async () => {
    const names = Array.from({ length: 3000 }, (_, i) => `stu${String(i).padStart(4, "0")}`);
    const first = await commit(roster(...names.map((u) => line(u))));
    expect(first.counts).toMatchObject({ created: 3000, skipped: 0 });

    const second = await commit(roster(...names.map((u) => line(u, { cls: "JR" }))), { mode: "FULL_SYNC" });
    expect(second.counts).toMatchObject({ updated: 3000, deactivated: 1 }); // viewer
  }, 120_000);
});
