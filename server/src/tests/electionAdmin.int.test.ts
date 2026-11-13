/**
 * Admin election management (shared/src/adminElections.ts) against the test database.
 * Run with `npm run test:int`.
 */
import { beforeAll, describe, expect, it } from "vitest";
import type { Prisma } from "@prisma/client";
import type { AdminElectionDetail, AdminPosition, ElectionInput, PositionInput } from "@asa/shared";
import { prisma } from "../utils/prisma";
import { ADMIN_ID, makeApp, resetWithBaseUsers, signedInAgent, STUDENT_ID } from "./integration/helpers";

type Agent = Awaited<ReturnType<typeof signedInAgent>>;

const app = makeApp();
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const MISSING = "00000000-0000-4000-8000-0000000000ff";

let admin: Agent; // platform admin
let asaAdmin: Agent; // ELECTION_ADMIN of ASA
let otherAdmin: Agent; // ORG_ADMIN of Outdoors Club
let student: Agent;
let asaId: string;
let otherId: string;

beforeAll(async () => {
  await resetWithBaseUsers();
  const asa = await prisma.organization.create({ data: { name: "Augustana Student Association", slug: "asa" } });
  const other = await prisma.organization.create({ data: { name: "Outdoors Club", slug: "outdoors" } });
  asaId = asa.id;
  otherId = other.id;
  const [asaUser, otherUser] = await Promise.all([
    prisma.user.create({ data: { username: "asa.admin", email: "asa.admin@augustana.edu", firstName: "Asa", lastName: "Admin" } }),
    prisma.user.create({ data: { username: "out.admin", email: "out.admin@augustana.edu", firstName: "Out", lastName: "Admin" } }),
  ]);
  await prisma.organizationRole.createMany({
    data: [
      { organizationId: asaId, userId: asaUser.id, role: "ELECTION_ADMIN" },
      { organizationId: otherId, userId: otherUser.id, role: "ORG_ADMIN" },
    ],
  });
  await prisma.user.createMany({
    data: [
      { username: "intl1", email: "intl1@ole.augie.edu", firstName: "Ina", lastName: "Intl", classStanding: "FR", onRoster: true },
      { username: "gone1", email: "gone1@ole.augie.edu", firstName: "Gus", lastName: "Gone", classStanding: "SR", onRoster: false },
    ],
  });
  [admin, asaAdmin, otherAdmin, student] = await Promise.all([
    signedInAgent(app, "admin"),
    signedInAgent(app, "asa.admin"),
    signedInAgent(app, "out.admin"),
    signedInAgent(app, "viewer"),
  ]);
});

// ---------- helpers ----------

function send(agent: Agent, method: "get" | "post" | "patch" | "put" | "delete", url: string, body?: unknown) {
  const req = agent[method](`/api/admin${url}`).set("X-Requested-With", "fetch");
  return body === undefined ? req : req.send(body as object);
}

function electionInput(overrides: Partial<ElectionInput> = {}): ElectionInput {
  const start = Date.now() + 2 * DAY;
  return {
    organizationId: asaId,
    title: "Spring Senate",
    description: "Vote for senators",
    startsAt: new Date(start).toISOString(),
    endsAt: new Date(start + DAY).toISOString(),
    eligibility: { type: "ALL_STUDENTS" },
    resultsVisibility: "STUDENTS",
    resultsRelease: "MANUAL",
    showTurnout: true,
    ...overrides,
  };
}

function positionInput(overrides: Partial<PositionInput> = {}): PositionInput {
  return {
    title: "President",
    description: null,
    seats: 1,
    votingMethod: "SINGLE_CHOICE",
    maxSelections: 1,
    allowAbstain: true,
    allowWriteIn: false,
    eligibility: { type: "ALL_STUDENTS" },
    ...overrides,
  };
}

async function createDraft(agent: Agent = admin, overrides: Partial<ElectionInput> = {}): Promise<AdminElectionDetail> {
  const res = await send(agent, "post", "/elections", electionInput(overrides));
  expect(res.status, JSON.stringify(res.body)).toBe(201);
  return res.body;
}

async function addPosition(electionId: string, overrides: Partial<PositionInput> = {}): Promise<AdminPosition> {
  const res = await send(admin, "post", `/elections/${electionId}/positions`, positionInput(overrides));
  expect(res.status, JSON.stringify(res.body)).toBe(201);
  return res.body;
}

async function addCandidate(positionId: string, name: string) {
  const res = await send(admin, "post", `/positions/${positionId}/candidates`, { name });
  expect(res.status, JSON.stringify(res.body)).toBe(201);
  return res.body as { id: string; sortOrder: number };
}

/** A published election with one position + 2 candidates, inserted directly with time-relative dates. */
async function seedPublished(when: "upcoming" | "open" | "closed", orgId = asaId) {
  const now = Date.now();
  const dates = {
    upcoming: { startsAt: new Date(now + DAY), endsAt: new Date(now + 2 * DAY) },
    open: { startsAt: new Date(now - HOUR), endsAt: new Date(now + DAY) },
    closed: { startsAt: new Date(now - 2 * DAY), endsAt: new Date(now - DAY) },
  }[when];
  const all = { type: "ALL_STUDENTS" } as Prisma.InputJsonObject;
  return prisma.election.create({
    data: {
      organizationId: orgId,
      title: `Seeded ${when}`,
      status: "PUBLISHED",
      eligibility: all,
      createdById: ADMIN_ID,
      ...dates,
      positions: {
        create: [
          {
            title: "President",
            eligibility: all,
            candidates: { create: [{ name: "Ann", sortOrder: 0 }, { name: "Ben", sortOrder: 1 }] },
          },
        ],
      },
    },
    include: { positions: { include: { candidates: true } } },
  });
}

// ---------- tests ----------

describe("permissions", () => {
  it("lists managed organizations per user", async () => {
    const all = await send(admin, "get", "/organizations/managed");
    expect(all.status).toBe(200);
    expect(all.body.map((o: { slug: string; role: unknown }) => [o.slug, o.role])).toEqual([
      ["asa", null],
      ["outdoors", null],
    ]);
    const mine = await send(asaAdmin, "get", "/organizations/managed");
    expect(mine.body).toEqual([{ id: asaId, name: "Augustana Student Association", slug: "asa", role: "ELECTION_ADMIN" }]);
    expect((await send(student, "get", "/organizations/managed")).body).toEqual([]);
  });

  it("lets org admins manage only their organization", async () => {
    const draft = await createDraft(asaAdmin);
    expect(draft.status).toBe("DRAFT");
    expect((await send(asaAdmin, "get", `/elections/${draft.id}`)).status).toBe(200);
    expect((await send(admin, "get", `/elections/${draft.id}`)).status).toBe(200);
    expect((await send(otherAdmin, "get", `/elections/${draft.id}`)).status).toBe(403);
    expect((await send(student, "get", `/elections/${draft.id}`)).status).toBe(403);
    expect((await send(otherAdmin, "patch", `/elections/${draft.id}`, { title: "Hijacked" })).status).toBe(403);
    expect((await send(otherAdmin, "post", "/elections", electionInput())).status).toBe(403);
    expect((await send(student, "post", "/elections", electionInput())).status).toBe(403);

    // Lists only show managed organizations.
    const otherList = await send(otherAdmin, "get", "/elections");
    expect(otherList.body.some((e: { id: string }) => e.id === draft.id)).toBe(false);
    expect((await send(otherAdmin, "get", "/elections?org=asa")).status).toBe(403);
    expect((await send(admin, "get", "/elections?org=nope")).status).toBe(404);
    expect((await send(student, "get", "/elections")).body).toEqual([]);
  });

  it("returns 404 for unknown or malformed ids and 401 when signed out", async () => {
    expect((await send(admin, "get", `/elections/${MISSING}`)).status).toBe(404);
    expect((await send(admin, "get", "/elections/not-a-uuid")).status).toBe(404);
    expect((await send(admin, "patch", `/positions/${MISSING}`, { title: "Nope" })).status).toBe(404);
    expect((await send(admin, "delete", `/candidates/${MISSING}`)).status).toBe(404);
    expect((await send(admin, "get", `/voter-lists/${MISSING}`)).status).toBe(404);
    const anon = await import("supertest").then((m) => m.default(app).get("/api/admin/elections"));
    expect(anon.status).toBe(401);
  });
});

describe("create and update", () => {
  it("creates a draft with detail fields", async () => {
    const d = await createDraft();
    expect(d).toMatchObject({
      title: "Spring Senate",
      status: "DRAFT",
      phase: "draft",
      locked: false,
      organization: { id: asaId, slug: "asa" },
      eligibilityText: "Open to all students",
      positionCount: 0,
      candidateCount: 0,
      votedCount: 0,
      positions: [],
      closedAt: null,
    });
    expect(d.publishIssues.map((i) => i.code)).toEqual(["NO_POSITIONS"]);
  });

  it("validates dates on create and on merged patch values", async () => {
    const bad = electionInput();
    const res = await send(admin, "post", "/elections", { ...bad, endsAt: bad.startsAt });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");

    const d = await createDraft();
    const patch = await send(admin, "patch", `/elections/${d.id}`, { endsAt: new Date(Date.now()).toISOString() });
    expect(patch.status).toBe(400);
    expect(patch.body.error.code).toBe("VALIDATION_ERROR");

    const ok = await send(admin, "patch", `/elections/${d.id}`, { title: "Renamed", showTurnout: false });
    expect(ok.status).toBe(200);
    expect(ok.body).toMatchObject({ title: "Renamed", showTurnout: false });
    const audit = await prisma.auditLog.findFirst({ where: { action: "ELECTION_UPDATED", entityId: d.id } });
    expect(audit?.metadata).toEqual({ fields: ["title", "showTurnout"] });
  });

  it("rejects voter lists that are missing or belong to another organization", async () => {
    const otherList = await send(admin, "post", "/voter-lists", { organizationId: otherId, name: "Other list" });
    const res = await send(admin, "post", "/elections", electionInput({ eligibility: { type: "VOTER_LIST", listId: otherList.body.id } }));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_VOTER_LIST");
    const d = await createDraft();
    const res2 = await send(admin, "post", `/elections/${d.id}/positions`, positionInput({ eligibility: { type: "VOTER_LIST", listId: MISSING } }));
    expect(res2.body.error.code).toBe("INVALID_VOTER_LIST");
  });
});

describe("locking", () => {
  it("allows only presentation fields on an open election", async () => {
    const e = await seedPublished("open");
    const title = await send(admin, "patch", `/elections/${e.id}`, { title: "Open Senate", resultsRelease: "AUTOMATIC" });
    expect(title.status).toBe(200);
    expect(title.body).toMatchObject({ title: "Open Senate", locked: true, phase: "open" });

    // Unchanged structural values are tolerated (forms may resend them).
    expect((await send(admin, "patch", `/elections/${e.id}`, { startsAt: e.startsAt.toISOString() })).status).toBe(200);

    const ends = await send(admin, "patch", `/elections/${e.id}`, { endsAt: new Date(Date.now() + 3 * DAY).toISOString() });
    expect(ends.status).toBe(409);
    expect(ends.body.error.code).toBe("ELECTION_LOCKED");
    expect(ends.body.error.details.fields).toEqual(["endsAt"]);

    const positionId = e.positions[0]!.id;
    const candidateId = e.positions[0]!.candidates[0]!.id;
    for (const res of [
      await send(admin, "post", `/elections/${e.id}/positions`, positionInput()),
      await send(admin, "patch", `/positions/${positionId}`, { title: "Changed" }),
      await send(admin, "delete", `/positions/${positionId}`),
      await send(admin, "post", `/positions/${positionId}/candidates`, { name: "Late Entry" }),
      await send(admin, "patch", `/candidates/${candidateId}`, { name: "Renamed" }),
      await send(admin, "delete", `/candidates/${candidateId}`),
      await send(admin, "put", `/elections/${e.id}/positions/order`, { ids: [positionId] }),
    ]) {
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe("ELECTION_LOCKED");
    }
  });

  it("rejects edits to cancelled elections", async () => {
    const e = await seedPublished("upcoming");
    expect((await send(admin, "post", `/elections/${e.id}/cancel`)).status).toBe(200);
    const res = await send(admin, "patch", `/elections/${e.id}`, { title: "After cancel" });
    expect(res.status).toBe(409);
    expect((await send(admin, "post", `/elections/${e.id}/positions`, positionInput())).status).toBe(409);
  });
});

describe("publishing and lifecycle", () => {
  it("blocks publishing until issues are fixed", async () => {
    const d = await createDraft();
    const pos = await addPosition(d.id, { title: "Senators", votingMethod: "MULTIPLE_CHOICE", maxSelections: 3, seats: 2 });
    const single = await addPosition(d.id, { title: "Chair", seats: 2 });

    const blocked = await send(admin, "post", `/elections/${d.id}/publish`);
    expect(blocked.status).toBe(400);
    expect(blocked.body.error.code).toBe("PUBLISH_BLOCKED");
    const codes = blocked.body.error.details.issues.map((i: { code: string; positionId?: string }) => [i.code, i.positionId]);
    expect(codes).toEqual([
      ["POSITION_NO_CANDIDATES", pos.id],
      ["POSITION_NO_CANDIDATES", single.id],
      ["SINGLE_CHOICE_MULTIPLE_SEATS", single.id],
    ]);

    await addCandidate(pos.id, "Ann");
    await addCandidate(pos.id, "Ben");
    let detail = (await send(admin, "get", `/elections/${d.id}`)).body as AdminElectionDetail;
    expect(detail.publishIssues.map((i) => i.code)).toContain("MAX_SELECTIONS_EXCEEDS_CANDIDATES");

    await addCandidate(pos.id, "Cat");
    await addCandidate(single.id, "Dan");
    expect((await send(admin, "patch", `/positions/${single.id}`, { seats: 1 })).status).toBe(200);

    const published = await send(admin, "post", `/elections/${d.id}/publish`);
    expect(published.status).toBe(200);
    expect(published.body).toMatchObject({ status: "PUBLISHED", phase: "upcoming", publishIssues: [], candidateCount: 4 });
    expect((await send(admin, "post", `/elections/${d.id}/publish`)).body.error.code).toBe("NOT_A_DRAFT");

    // Visible publicly now; drafts are not.
    const pub = await import("supertest").then((m) => m.default(app).get(`/api/elections/${d.id}`));
    expect(pub.status).toBe(200);
    detail = (await send(admin, "post", `/elections/${d.id}/unpublish`)).body;
    expect(detail.status).toBe("DRAFT");
    const hidden = await import("supertest").then((m) => m.default(app).get(`/api/elections/${d.id}`));
    expect(hidden.status).toBe(404);
  });

  it("flags elections ending in the past and empty voter lists", async () => {
    const list = (await send(admin, "post", "/voter-lists", { organizationId: asaId, name: "Empty list" })).body;
    const d = await createDraft(admin, {
      startsAt: new Date(Date.now() - 2 * DAY).toISOString(),
      endsAt: new Date(Date.now() - DAY).toISOString(),
      eligibility: { type: "VOTER_LIST", listId: list.id },
    });
    expect(d.eligibilityText).toBe('Open to students on the "Empty list" list');
    expect(d.publishIssues.map((i) => i.code)).toEqual(["ENDS_IN_PAST", "NO_POSITIONS", "VOTER_LIST_EMPTY"]);
  });

  it("enforces state rules for unpublish, close, cancel and delete", async () => {
    const open = await seedPublished("open");
    const closed = await seedPublished("closed");
    const upcoming = await seedPublished("upcoming");

    expect((await send(admin, "post", `/elections/${open.id}/unpublish`)).status).toBe(409);
    expect((await send(admin, "post", `/elections/${upcoming.id}/close`)).body.error.code).toBe("INVALID_ELECTION_STATE");

    const closing = await send(asaAdmin, "post", `/elections/${open.id}/close`);
    expect(closing.status).toBe(200);
    expect(closing.body.phase).toBe("closed");
    expect(closing.body.closedAt).not.toBeNull();
    expect((await send(admin, "post", `/elections/${open.id}/close`)).status).toBe(409);

    expect((await send(admin, "post", `/elections/${closed.id}/cancel`)).status).toBe(409);
    const cancelled = await send(admin, "post", `/elections/${upcoming.id}/cancel`);
    expect(cancelled.body).toMatchObject({ status: "CANCELLED", phase: "cancelled" });
    expect((await send(admin, "post", `/elections/${upcoming.id}/cancel`)).status).toBe(409);

    const del = await send(admin, "delete", `/elections/${closed.id}`);
    expect(del.status).toBe(409);
    expect(del.body.error.code).toBe("NOT_A_DRAFT");

    const draft = await createDraft();
    const p = await addPosition(draft.id);
    await addCandidate(p.id, "Ann");
    expect((await send(admin, "delete", `/elections/${draft.id}`)).status).toBe(204);
    expect(await prisma.election.findUnique({ where: { id: draft.id } })).toBeNull();

    const actions = (await prisma.auditLog.findMany({ where: { entityId: { in: [open.id, upcoming.id, draft.id] } } })).map(
      (a) => a.action,
    );
    expect(actions).toEqual(expect.arrayContaining(["ELECTION_CLOSED", "ELECTION_CANCELLED", "ELECTION_DELETED"]));
  });

  it("sorts the admin list: active by start, then finished by end (newest first)", async () => {
    const res = await send(admin, "get", "/elections?org=asa");
    expect(res.status).toBe(200);
    const phases: string[] = res.body.map((e: { phase: string }) => e.phase);
    const firstFinished = phases.findIndex((p) => p === "closed" || p === "cancelled");
    expect(firstFinished).toBeGreaterThan(0);
    expect(phases.slice(firstFinished).every((p) => p === "closed" || p === "cancelled")).toBe(true);

    const drafts = await send(admin, "get", "/elections?status=DRAFT");
    expect(drafts.body.every((e: { status: string }) => e.status === "DRAFT")).toBe(true);

    // Cancelled elections never appear publicly.
    const pub = await import("supertest").then((m) => m.default(app).get("/api/elections"));
    expect(pub.body.every((e: { status: string }) => e.status === "PUBLISHED")).toBe(true);
  });

  it("duplicates structure into a new draft a week out", async () => {
    const src = await seedPublished("closed");
    const res = await send(admin, "post", `/elections/${src.id}/duplicate`);
    expect(res.status).toBe(201);
    const copy = res.body as AdminElectionDetail;
    expect(copy).toMatchObject({ title: "Copy of Seeded closed", status: "DRAFT", positionCount: 1, candidateCount: 2, votedCount: 0 });
    expect(copy.id).not.toBe(src.id);
    expect(copy.positions[0]!.candidates.map((c) => c.name)).toEqual(["Ann", "Ben"]);
    const start = new Date(copy.startsAt).getTime();
    expect(Math.abs(start - (Date.now() + 7 * DAY))).toBeLessThan(2 * 60 * 1000);
    expect(new Date(copy.endsAt).getTime() - start).toBe(src.endsAt.getTime() - src.startsAt.getTime());
  });
});

describe("positions and candidates", () => {
  it("creates, updates, reorders and deletes", async () => {
    const d = await createDraft();
    const a = await addPosition(d.id, { title: "Alpha" });
    const b = await addPosition(d.id, { title: "Bravo" });
    expect([a.sortOrder, b.sortOrder]).toEqual([0, 1]);

    const singleMulti = await send(admin, "post", `/elections/${d.id}/positions`, positionInput({ maxSelections: 2 }));
    expect(singleMulti.status).toBe(400);
    // Merged validation: switching to SINGLE_CHOICE while maxSelections is 3 fails.
    const multi = await addPosition(d.id, { title: "Charlie", votingMethod: "MULTIPLE_CHOICE", maxSelections: 3 });
    expect((await send(admin, "patch", `/positions/${multi.id}`, { votingMethod: "SINGLE_CHOICE" })).status).toBe(400);
    const fixed = await send(admin, "patch", `/positions/${multi.id}`, { votingMethod: "SINGLE_CHOICE", maxSelections: 1 });
    expect(fixed.status).toBe(200);
    expect(fixed.body).toMatchObject({ votingMethod: "SINGLE_CHOICE", maxSelections: 1, title: "Charlie" });

    const reordered = await send(admin, "put", `/elections/${d.id}/positions/order`, { ids: [multi.id, b.id, a.id] });
    expect(reordered.status).toBe(200);
    expect(reordered.body.map((p: AdminPosition) => p.title)).toEqual(["Charlie", "Bravo", "Alpha"]);
    const wrong = await send(admin, "put", `/elections/${d.id}/positions/order`, { ids: [a.id, b.id] });
    expect(wrong.status).toBe(400);
    expect(wrong.body.error.code).toBe("INVALID_ORDER");
    expect((await send(admin, "put", `/elections/${d.id}/positions/order`, { ids: [a.id, a.id, b.id] })).status).toBe(400);

    const c1 = await addCandidate(a.id, "Ann");
    const c2 = await addCandidate(a.id, "Ben");
    expect([c1.sortOrder, c2.sortOrder]).toEqual([0, 1]);
    const upd = await send(admin, "patch", `/candidates/${c1.id}`, { bio: "Hello", photoUrl: "https://example.com/a.jpg" });
    expect(upd.body).toMatchObject({ name: "Ann", bio: "Hello", photoUrl: "https://example.com/a.jpg" });
    expect((await send(admin, "patch", `/candidates/${c1.id}`, { photoUrl: "not a url" })).status).toBe(400);
    const order = await send(admin, "put", `/positions/${a.id}/candidates/order`, { ids: [c2.id, c1.id] });
    expect(order.body.map((c: { name: string }) => c.name)).toEqual(["Ben", "Ann"]);
    expect((await send(admin, "put", `/positions/${a.id}/candidates/order`, { ids: [c2.id] })).status).toBe(400);

    expect((await send(admin, "delete", `/candidates/${c2.id}`)).status).toBe(204);
    expect((await send(admin, "delete", `/positions/${a.id}`)).status).toBe(204);
    const detail = (await send(admin, "get", `/elections/${d.id}`)).body as AdminElectionDetail;
    expect(detail.positions.map((p) => p.title)).toEqual(["Charlie", "Bravo"]);

    const actions = new Set((await prisma.auditLog.findMany({ select: { action: true } })).map((a) => a.action));
    for (const a of ["POSITION_CREATED", "POSITION_UPDATED", "POSITION_DELETED", "CANDIDATE_CREATED", "CANDIDATE_UPDATED", "CANDIDATE_DELETED"]) {
      expect(actions.has(a), a).toBe(true);
    }
  });

  it("allows structural edits while upcoming", async () => {
    const e = await seedPublished("upcoming");
    expect((await send(admin, "post", `/positions/${e.positions[0]!.id}/candidates`, { name: "Cal" })).status).toBe(201);
  });
});

describe("voter lists", () => {
  it("creates, fills (deduped), renames and reports unknown members", async () => {
    const created = await send(asaAdmin, "post", "/voter-lists", { organizationId: asaId, name: "International" });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ name: "International", memberCount: 0, unknownCount: 0, members: [] });
    const id = created.body.id;

    expect((await send(otherAdmin, "get", `/voter-lists/${id}`)).status).toBe(403);
    expect((await send(otherAdmin, "post", "/voter-lists", { organizationId: asaId, name: "Nope" })).status).toBe(403);

    const filled = await send(asaAdmin, "put", `/voter-lists/${id}/members`, {
      usernames: ["INTL1", "intl1", "gone1", "ghost", " viewer "],
    });
    expect(filled.status).toBe(200);
    expect(filled.body).toMatchObject({ memberCount: 4, unknownCount: 2 });
    expect(filled.body.members).toEqual([
      { username: "ghost", name: null, onRoster: false },
      { username: "gone1", name: "Gus Gone", onRoster: false },
      { username: "intl1", name: "Ina Intl", onRoster: true },
      { username: "viewer", name: "Vera Viewer", onRoster: true },
    ]);

    const replaced = await send(asaAdmin, "put", `/voter-lists/${id}/members`, { usernames: ["intl1"] });
    expect(replaced.body.memberCount).toBe(1);

    const renamed = await send(asaAdmin, "patch", `/voter-lists/${id}`, { name: "International students" });
    expect(renamed.body.name).toBe("International students");

    const summaries = await send(asaAdmin, "get", "/voter-lists");
    const mine = summaries.body.find((l: { id: string }) => l.id === id);
    expect(mine).toMatchObject({ memberCount: 1, unknownCount: 0, organization: { slug: "asa" } });
    expect((await send(otherAdmin, "get", "/voter-lists")).body.every((l: { organization: { slug: string } }) => l.organization.slug === "outdoors")).toBe(true);

    const audit = await prisma.auditLog.findMany({ where: { entityId: id }, orderBy: { createdAt: "asc" } });
    expect(audit.map((a) => a.action)).toEqual([
      "VOTER_LIST_CREATED",
      "VOTER_LIST_MEMBERS_REPLACED",
      "VOTER_LIST_MEMBERS_REPLACED",
      "VOTER_LIST_UPDATED",
    ]);
  });

  it("refuses deleting lists in use and member changes during an open election", async () => {
    const list = (await send(admin, "post", "/voter-lists", { organizationId: asaId, name: "Used" })).body;
    await send(admin, "put", `/voter-lists/${list.id}/members`, { usernames: ["intl1"] });
    const d = await createDraft();
    await addPosition(d.id, { title: "Intl Senator", eligibility: { type: "VOTER_LIST", listId: list.id } });

    const del = await send(admin, "delete", `/voter-lists/${list.id}`);
    expect(del.status).toBe(409);
    expect(del.body.error.code).toBe("VOTER_LIST_IN_USE");
    // Drafts may still change their members.
    expect((await send(admin, "put", `/voter-lists/${list.id}/members`, { usernames: ["intl1", "viewer"] })).status).toBe(200);

    const open = await seedPublished("open");
    await prisma.election.update({
      where: { id: open.id },
      data: { eligibility: { type: "VOTER_LIST", listId: list.id } },
    });
    const locked = await send(admin, "put", `/voter-lists/${list.id}/members`, { usernames: [] });
    expect(locked.status).toBe(409);
    expect(locked.body.error.code).toBe("ELECTION_LOCKED");

    const unused = (await send(admin, "post", "/voter-lists", { organizationId: asaId, name: "Unused" })).body;
    expect((await send(admin, "delete", `/voter-lists/${unused.id}`)).status).toBe(204);
    expect((await prisma.auditLog.count({ where: { action: "VOTER_LIST_DELETED", entityId: unused.id } }))).toBe(1);
  });
});

it("never lets students reach election management", async () => {
  expect(STUDENT_ID).toBeTruthy();
  expect((await send(student, "get", "/voter-lists?org=asa")).status).toBe(403);
  expect((await send(student, "post", "/voter-lists", { organizationId: asaId, name: "Mine" })).status).toBe(403);
});
