/**
 * Results (docs/ARCHITECTURE.md §4.5) against the test database. Run with `npm run test:int`.
 */
import { beforeAll, describe, expect, it } from "vitest";
import type { BallotChoiceInput, ElectionResults } from "@asa/shared";
import { prisma } from "../utils/prisma";
import { ADMIN_ID, makeApp, resetWithBaseUsers, signedInAgent } from "./integration/helpers";
import request from "supertest";

type Agent = Awaited<ReturnType<typeof signedInAgent>>;

const app = makeApp();
const DAY = 24 * 60 * 60 * 1000;

let electionId: string;
let pres: { id: string; ann: string; ben: string };
let sen: { id: string; cal: string; dee: string };
let admin: Agent;
let student: Agent;

const post = (agent: Agent, path: string, body: object = {}) =>
  agent.post(path).set("X-Requested-With", "fetch").send(body);

async function setElection(data: Parameters<typeof prisma.election.update>[0]["data"]) {
  await prisma.election.update({ where: { id: electionId }, data });
}

beforeAll(async () => {
  await resetWithBaseUsers(); // admin (platform admin) + viewer (SO), both on the roster
  const orgId = (await prisma.organization.create({ data: { name: "Augustana Student Association", slug: "asa" } })).id;
  await prisma.user.createMany({
    data: [
      { username: "v1", email: "v1@ole.augie.edu", firstName: "Val", lastName: "One", classStanding: "FR", onRoster: true },
      { username: "v2", email: "v2@ole.augie.edu", firstName: "Vic", lastName: "Two", classStanding: "JR", onRoster: true },
    ],
  });

  const e = await prisma.election.create({
    data: {
      organizationId: orgId,
      title: "ASA General Election",
      startsAt: new Date(Date.now() - 2 * DAY),
      endsAt: new Date(Date.now() + DAY),
      status: "PUBLISHED",
      eligibility: { type: "ALL_STUDENTS" },
      resultsRelease: "MANUAL",
      resultsVisibility: "STUDENTS",
      createdById: ADMIN_ID,
      positions: {
        create: [
          {
            title: "President",
            eligibility: { type: "ALL_STUDENTS" },
            sortOrder: 0,
            candidates: { create: [{ name: "Ann", sortOrder: 0 }, { name: "Ben", sortOrder: 1 }] },
          },
          {
            title: "Senators",
            eligibility: { type: "ALL_STUDENTS" },
            sortOrder: 1,
            seats: 2,
            votingMethod: "MULTIPLE_CHOICE",
            maxSelections: 2,
            allowAbstain: false,
            allowWriteIn: true,
            candidates: { create: [{ name: "Cal", sortOrder: 0 }, { name: "Dee", sortOrder: 1 }] },
          },
        ],
      },
    },
    include: { positions: { orderBy: { sortOrder: "asc" }, include: { candidates: { orderBy: { sortOrder: "asc" } } } } },
  });
  electionId = e.id;
  const [p, s] = e.positions;
  pres = { id: p!.id, ann: p!.candidates[0]!.id, ben: p!.candidates[1]!.id };
  sen = { id: s!.id, cal: s!.candidates[0]!.id, dee: s!.candidates[1]!.id };

  admin = await signedInAgent(app, "admin");
  student = await signedInAgent(app, "viewer");
  const ballots: [Agent, BallotChoiceInput[]][] = [
    [student, [{ positionId: pres.id, candidateIds: [pres.ann] }, { positionId: sen.id, candidateIds: [sen.cal], writeIn: "ada lovelace" }]],
    [await signedInAgent(app, "v1"), [{ positionId: pres.id, candidateIds: [pres.ann] }, { positionId: sen.id, candidateIds: [sen.cal, sen.dee] }]],
    [await signedInAgent(app, "v2"), [{ positionId: pres.id, abstain: true }, { positionId: sen.id, candidateIds: [sen.dee], writeIn: "Ada   Lovelace" }]],
  ];
  for (const [agent, choices] of ballots) {
    const res = await post(agent, `/api/elections/${electionId}/vote`, { choices });
    expect(res.status).toBe(201);
  }
});

describe("results", () => {
  it("are unavailable to everyone while voting is open", async () => {
    const pub = await student.get(`/api/elections/${electionId}/results`);
    expect(pub.status).toBe(403);
    expect(pub.body.error.code).toBe("RESULTS_NOT_AVAILABLE");
    expect((await admin.get(`/api/admin/elections/${electionId}/results`)).status).toBe(409);
    expect((await post(admin, `/api/admin/elections/${electionId}/results/publish`)).status).toBe(409);
  });

  it("let admins preview the tally once voting closes, before release", async () => {
    await setElection({ endsAt: new Date(Date.now() - 1000) });

    const studentView = await student.get(`/api/elections/${electionId}/results`);
    expect(studentView.status).toBe(403);
    expect(studentView.body.error.message).toMatch(/released/);

    const res = await admin.get(`/api/admin/elections/${electionId}/results`);
    expect(res.status).toBe(200);
    const r = res.body as ElectionResults;
    expect(r).toMatchObject({ released: false, publishedAt: null, turnout: { voted: 3, eligible: 4 } });

    const [president, senators] = r.positions;
    expect(president).toMatchObject({ title: "President", totalBallots: 3, abstentions: 1, tie: false });
    expect(president!.candidates.map((c) => [c.name, c.votes, c.outcome])).toEqual([
      ["Ann", 2, "WON"],
      ["Ben", 0, null],
    ]);
    // Cal, Dee and the grouped write-in all have 2 votes for 2 seats → tie.
    expect(senators).toMatchObject({ totalBallots: 3, abstentions: 0, tie: true });
    expect(senators!.candidates).toHaveLength(3);
    expect(senators!.candidates.every((c) => c.votes === 2 && c.outcome === "TIED")).toBe(true);
    const writeIn = senators!.candidates.find((c) => c.writeIn);
    expect(writeIn?.name.toLowerCase()).toBe("ada lovelace");

    // Aggregates only: no ballot ids, receipt hashes or voter names anywhere in the response.
    expect(JSON.stringify(r)).not.toMatch(/receipt|ballotId|viewer|v1|v2/i);
  });

  it("only org admins can use the admin endpoints", async () => {
    expect((await student.get(`/api/admin/elections/${electionId}/results`)).status).toBe(403);
    expect((await post(student, `/api/admin/elections/${electionId}/results/publish`, { acknowledgeLowTurnout: true })).status).toBe(403);
  });

  it("require acknowledging low turnout, then release to students", async () => {
    const blocked = await post(admin, `/api/admin/elections/${electionId}/results/publish`);
    expect(blocked.status).toBe(409);
    expect(blocked.body.error.code).toBe("LOW_TURNOUT");
    expect(blocked.body.error.details.positions).toHaveLength(2);

    const ok = await post(admin, `/api/admin/elections/${electionId}/results/publish`, { acknowledgeLowTurnout: true });
    expect(ok.status).toBe(200);
    expect(ok.body.released).toBe(true);

    const again = await post(admin, `/api/admin/elections/${electionId}/results/publish`, { acknowledgeLowTurnout: true });
    expect(again.body.error.code).toBe("RESULTS_ALREADY_RELEASED");

    const view = await student.get(`/api/elections/${electionId}/results`);
    expect(view.status).toBe(200);
    expect(view.body.turnout).toEqual({ voted: 3, eligible: 4 });

    const detail = await student.get(`/api/elections/${electionId}`);
    expect(detail.body.resultsAvailable).toBe(true);

    // STUDENTS visibility: signed-out visitors are asked to sign in.
    expect((await request(app).get(`/api/elections/${electionId}/results`)).status).toBe(401);

    const audit = await prisma.auditLog.findFirst({ where: { action: "RESULTS_PUBLISHED", entityId: electionId } });
    expect(audit?.metadata).toEqual({ acknowledgedLowTurnout: true });
  });

  it("follow visibility and turnout settings", async () => {
    await setElection({ resultsVisibility: "PUBLIC", showTurnout: false });
    const anon = await request(app).get(`/api/elections/${electionId}/results`);
    expect(anon.status).toBe(200);
    expect(anon.body.turnout).toBeNull();
    // Admins always see turnout in the admin view.
    expect((await admin.get(`/api/admin/elections/${electionId}/results`)).body.turnout).not.toBeNull();

    await setElection({ resultsVisibility: "ADMINS_ONLY" });
    const hidden = await student.get(`/api/elections/${electionId}/results`);
    expect(hidden.status).toBe(403);
    expect(hidden.body.error.message).toMatch(/organizers/);
    expect((await admin.get(`/api/elections/${electionId}/results`)).status).toBe(200);
    await setElection({ resultsVisibility: "STUDENTS", showTurnout: true });
  });

  it("can be unpublished, and automatic release needs no button", async () => {
    const res = await post(admin, `/api/admin/elections/${electionId}/results/unpublish`);
    expect(res.status).toBe(200);
    expect(res.body.released).toBe(false);
    expect((await student.get(`/api/elections/${electionId}/results`)).status).toBe(403);
    expect(await prisma.auditLog.count({ where: { action: "RESULTS_UNPUBLISHED", entityId: electionId } })).toBe(1);

    await setElection({ resultsRelease: "AUTOMATIC" });
    expect((await student.get(`/api/elections/${electionId}/results`)).status).toBe(200);
    const publish = await post(admin, `/api/admin/elections/${electionId}/results/publish`, { acknowledgeLowTurnout: true });
    expect(publish.body.error.code).toBe("RESULTS_AUTOMATIC");
  });

  it("don't exist for drafts or malformed ids", async () => {
    await setElection({ status: "DRAFT" });
    expect((await student.get(`/api/elections/${electionId}/results`)).status).toBe(404);
    expect((await student.get(`/api/elections/not-a-uuid/results`)).status).toBe(404);
    await setElection({ status: "PUBLISHED" });
  });
});
