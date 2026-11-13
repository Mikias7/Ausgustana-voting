/**
 * Voting (docs/ARCHITECTURE.md §4.4) against the test database. Run with `npm run test:int`.
 */
import { beforeAll, describe, expect, it } from "vitest";
import type { Prisma } from "@prisma/client";
import { RECEIPT_CODE_PATTERN, type BallotChoiceInput } from "@asa/shared";
import { prisma } from "../utils/prisma";
import { hashReceiptCode } from "../utils/receipt";
import { ADMIN_ID, makeApp, resetWithBaseUsers, signedInAgent } from "./integration/helpers";

type Agent = Awaited<ReturnType<typeof signedInAgent>>;

const app = makeApp();
const DAY = 24 * 60 * 60 * 1000;

let orgId: string;
let senate: { id: string; so: string; fr: string; atLarge: string; intl: string; soC: string; frC: string; alC: string[]; intlC: string };
let listId: string;

async function makeElection(data: Partial<Prisma.ElectionUncheckedCreateInput> = {}) {
  return prisma.election.create({
    data: {
      organizationId: orgId,
      title: "Test Election",
      startsAt: new Date(Date.now() - DAY),
      endsAt: new Date(Date.now() + DAY),
      status: "PUBLISHED",
      eligibility: { type: "ALL_STUDENTS" },
      createdById: ADMIN_ID,
      ...data,
    },
  });
}

async function makePosition(
  electionId: string,
  title: string,
  eligibility: Prisma.InputJsonValue,
  candidates: string[],
  extra: Partial<Prisma.PositionUncheckedCreateInput> = {},
) {
  const p = await prisma.position.create({
    data: {
      electionId,
      title,
      eligibility,
      ...extra,
      candidates: { create: candidates.map((name, i) => ({ name, sortOrder: i })) },
    },
    include: { candidates: { orderBy: { sortOrder: "asc" } } },
  });
  return { id: p.id, candidateIds: p.candidates.map((c) => c.id) };
}

function vote(agent: Agent, electionId: string, choices: BallotChoiceInput[]) {
  return agent.post(`/api/elections/${electionId}/vote`).set("X-Requested-With", "fetch").send({ choices });
}

beforeAll(async () => {
  await resetWithBaseUsers(); // admin + viewer (SO)
  orgId = (await prisma.organization.create({ data: { name: "Augustana Student Association", slug: "asa" } })).id;
  await prisma.user.createMany({
    data: [
      { username: "fresh1", email: "fresh1@ole.augie.edu", firstName: "Fay", lastName: "Fresh", classStanding: "FR", onRoster: true },
      { username: "soph2", email: "soph2@ole.augie.edu", firstName: "Sam", lastName: "Soph", classStanding: "SO", onRoster: true },
      { username: "soph3", email: "soph3@ole.augie.edu", firstName: "Sol", lastName: "Soph", classStanding: "SO", onRoster: true },
      { username: "gone1", email: "gone1@ole.augie.edu", firstName: "Gus", lastName: "Gone", classStanding: "SO", onRoster: false },
    ],
  });
  listId = (
    await prisma.voterList.create({
      data: { name: "International students", organizationId: orgId, members: { create: [{ username: "soph2" }] } },
    })
  ).id;

  const e = await makeElection({ title: "ASA Senate" });
  const so = await makePosition(e.id, "Sophomore Senator", { type: "CLASS_STANDING", classes: ["SO"] }, ["Sora", "Sven"]);
  const fr = await makePosition(e.id, "Freshman Senator", { type: "CLASS_STANDING", classes: ["FR"] }, ["Finn"]);
  const atLarge = await makePosition(e.id, "At-Large Senators", { type: "ALL_STUDENTS" }, ["Ann", "Ben", "Cal"], {
    votingMethod: "MULTIPLE_CHOICE",
    maxSelections: 2,
    seats: 2,
    allowAbstain: false,
    allowWriteIn: true,
  });
  const intl = await makePosition(e.id, "International Senator", { type: "VOTER_LIST", listId }, ["Ines"]);
  senate = {
    id: e.id,
    so: so.id,
    fr: fr.id,
    atLarge: atLarge.id,
    intl: intl.id,
    soC: so.candidateIds[0]!,
    frC: fr.candidateIds[0]!,
    alC: atLarge.candidateIds,
    intlC: intl.candidateIds[0]!,
  };
});

describe("POST /api/elections/:id/vote", () => {
  let viewer: Agent;
  let receipt: string;

  beforeAll(async () => {
    viewer = await signedInAgent(app, "viewer");
  });

  it("requires sign-in and the CSRF header", async () => {
    const anon = await vote(await import("supertest").then((m) => m.default.agent(app)), senate.id, []);
    expect(anon.status).toBe(401);
    const noHeader = await viewer.post(`/api/elections/${senate.id}/vote`).send({ choices: [] });
    expect(noHeader.status).toBe(403);
  });

  it("rejects a ballot with a position the voter is not eligible for, and stores nothing", async () => {
    const res = await vote(viewer, senate.id, [
      { positionId: senate.so, candidateIds: [senate.soC] },
      { positionId: senate.fr, candidateIds: [senate.frC] },
      { positionId: senate.atLarge, candidateIds: [senate.alC[0]!] },
    ]);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_BALLOT");
    expect(res.body.error.details.issues).toEqual([{ positionId: senate.fr, message: "You can't vote for this position" }]);
    expect(await prisma.ballot.count()).toBe(0);
    expect(await prisma.voterParticipation.count()).toBe(0);
  });

  it("casts a ballot: participation and an unlinked ballot, receipt returned once", async () => {
    const res = await vote(viewer, senate.id, [
      { positionId: senate.so, candidateIds: [senate.soC] },
      { positionId: senate.atLarge, candidateIds: [senate.alC[0]!], writeIn: "Dana Write" },
    ]);
    expect(res.status).toBe(201);
    expect(Object.keys(res.body)).toEqual(["receiptCode"]);
    receipt = res.body.receiptCode;
    expect(receipt).toMatch(RECEIPT_CODE_PATTERN);

    const ballots = await prisma.ballot.findMany({ include: { selections: true } });
    expect(ballots).toHaveLength(1);
    const ballot = ballots[0]!;
    // No identity or time on the ballot; only the receipt hash.
    expect(Object.keys(ballot).sort()).toEqual(["electionId", "id", "receiptHash", "selections"]);
    expect(ballot.receiptHash).toBe(hashReceiptCode(receipt));
    expect(ballot.receiptHash).not.toContain(receipt);
    expect(ballot.selections.map((s) => [s.positionId, s.candidateId, s.writeIn, s.abstain])).toEqual(
      expect.arrayContaining([
        [senate.so, senate.soC, null, false],
        [senate.atLarge, senate.alC[0], null, false],
        [senate.atLarge, null, "Dana Write", false],
      ]),
    );

    const participation = await prisma.voterParticipation.findMany({ where: { electionId: senate.id } });
    expect(participation.map((p) => p.userId)).toHaveLength(1);

    const audit = await prisma.auditLog.findMany({ where: { action: "VOTE_CAST" } });
    expect(audit).toHaveLength(1);
    expect(audit[0]!.entityId).toBe(senate.id);
    expect(audit[0]!.metadata).toBeNull();
  });

  it("blocks a second ballot", async () => {
    const res = await vote(viewer, senate.id, [
      { positionId: senate.so, candidateIds: [senate.soC] },
      { positionId: senate.atLarge, candidateIds: [senate.alC[1]!] },
    ]);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("ALREADY_VOTED");
    expect(await prisma.ballot.count()).toBe(1);
  });

  it("shows hasVoted on the election and in the profile, never the choices", async () => {
    const detail = await viewer.get(`/api/elections/${senate.id}`);
    expect(detail.body.myStatus.hasVoted).toBe(true);
    const me = await viewer.get("/api/me");
    expect(me.body.participations).toHaveLength(1);
    expect(JSON.stringify(me.body)).not.toContain(senate.soC);
  });

  it("lets only one of several simultaneous submissions through", async () => {
    const soph3 = await signedInAgent(app, "soph3");
    const choices = [
      { positionId: senate.so, abstain: true },
      { positionId: senate.atLarge, candidateIds: [senate.alC[2]!] },
    ];
    const results = await Promise.all(Array.from({ length: 5 }, () => vote(soph3, senate.id, choices)));
    const statuses = results.map((r) => r.status).sort();
    expect(statuses).toEqual([201, 409, 409, 409, 409]);
    expect(await prisma.ballot.count()).toBe(2);
    expect(await prisma.voterParticipation.count({ where: { electionId: senate.id } })).toBe(2);
  });

  it("enforces voter-list eligibility", async () => {
    const soph2 = await signedInAgent(app, "soph2");
    const missing = await vote(soph2, senate.id, [
      { positionId: senate.so, candidateIds: [senate.soC] },
      { positionId: senate.atLarge, candidateIds: [senate.alC[0]!] },
    ]);
    expect(missing.status).toBe(400);
    expect(missing.body.error.details.issues[0].message).toBe("International Senator is missing from your ballot");

    const ok = await vote(soph2, senate.id, [
      { positionId: senate.so, candidateIds: [senate.soC] },
      { positionId: senate.atLarge, candidateIds: [senate.alC[0]!] },
      { positionId: senate.intl, candidateIds: [senate.intlC] },
    ]);
    expect(ok.status).toBe(201);
  });

  it("rejects students who are off the roster", async () => {
    const gone = await signedInAgent(app, "gone1");
    const res = await vote(gone, senate.id, [{ positionId: senate.atLarge, candidateIds: [senate.alC[0]!] }]);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("NOT_ELIGIBLE");
  });

  it("re-checks the roster at submission time, not just at sign-in", async () => {
    const fresh = await signedInAgent(app, "fresh1");
    await prisma.user.update({ where: { username: "fresh1" }, data: { onRoster: false } });
    const res = await vote(fresh, senate.id, [
      { positionId: senate.fr, candidateIds: [senate.frC] },
      { positionId: senate.atLarge, candidateIds: [senate.alC[0]!] },
    ]);
    expect(res.status).toBe(403);
    await prisma.user.update({ where: { username: "fresh1" }, data: { onRoster: true } });
  });

  it("only accepts votes while the election is open", async () => {
    const fresh = await signedInAgent(app, "fresh1");
    const cases = [
      { data: { startsAt: new Date(Date.now() + DAY), endsAt: new Date(Date.now() + 2 * DAY) }, status: 409 },
      { data: { startsAt: new Date(Date.now() - 2 * DAY), endsAt: new Date(Date.now() - DAY) }, status: 409 },
      { data: { closedAt: new Date() }, status: 409 },
      { data: { status: "CANCELLED" as const }, status: 409 },
      { data: { status: "DRAFT" as const }, status: 404 },
    ];
    for (const c of cases) {
      const e = await makeElection(c.data);
      const p = await makePosition(e.id, "Rep", { type: "ALL_STUDENTS" }, ["X"]);
      const res = await vote(fresh, e.id, [{ positionId: p.id, candidateIds: [p.candidateIds[0]!] }]);
      expect(res.status).toBe(c.status);
    }
    const notFound = await vote(fresh, "00000000-0000-4000-8000-0000000000ff", []);
    expect(notFound.status).toBe(400); // empty ballot fails validation first
    const bad = await vote(fresh, "not-a-uuid", [{ positionId: senate.fr, candidateIds: [senate.frC] }]);
    expect(bad.status).toBe(404);
  });

  describe("POST /api/receipts/check", () => {
    const check = (code: string) =>
      viewer.post("/api/receipts/check").set("X-Requested-With", "fetch").send({ code });

    it("confirms a recorded ballot, tolerating case and spacing", async () => {
      const res = await check(receipt.toLowerCase().replace(/-/g, " "));
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ recorded: true, election: { id: senate.id, title: "ASA Senate" } });
    });

    it("reports unknown or malformed codes as not recorded", async () => {
      expect((await check("AAAA-BBBB-CCCC")).body).toEqual({ recorded: false, election: null });
      expect((await check("nope")).body).toEqual({ recorded: false, election: null });
    });
  });
});
