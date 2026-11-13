/** Admin student list + roster stats against the test database. */
import { beforeAll, describe, expect, it } from "vitest";
import type { Paginated, StudentListItem } from "@asa/shared";
import { prisma } from "../utils/prisma";
import { makeApp, resetWithBaseUsers, signedInAgent } from "./integration/helpers";

const app = makeApp();
let admin: Awaited<ReturnType<typeof signedInAgent>>;

beforeAll(async () => {
  await resetWithBaseUsers(); // admin (PLATFORM_ADMIN) + viewer (SO, on roster)
  await prisma.user.createMany({
    data: [
      // 30 on-roster freshmen: fr00..fr29, last names Zeta00..Zeta29
      ...Array.from({ length: 30 }, (_, i) => {
        const n = String(i).padStart(2, "0");
        return {
          username: `fr${n}`,
          email: `fr${n}@ole.augie.edu`,
          firstName: `Fresh${n}`,
          lastName: `Zeta${n}`,
          classStanding: "FR" as const,
          onRoster: true,
        };
      }),
      { username: "sr.gone", email: "sr.gone@ole.augie.edu", firstName: "Olivia", lastName: "Alder", classStanding: "SR", onRoster: false },
      { username: "noclass", email: "noclass@ole.augie.edu", firstName: "Nora", lastName: "Birch", classStanding: null, onRoster: true },
      { username: "jr.smith", email: "jr.smith@ole.augie.edu", firstName: "Sam", lastName: "Smith", classStanding: "JR", onRoster: true },
    ],
  });
  admin = await signedInAgent(app, "admin");
});

async function list(query: string): Promise<Paginated<StudentListItem>> {
  const res = await admin.get(`/api/admin/students${query}`);
  expect(res.status, JSON.stringify(res.body)).toBe(200);
  return res.body;
}

describe("GET /api/admin/students", () => {
  it("lists students only, sorted by last then first name, 25 per page by default", async () => {
    const page1 = await list("");
    expect(page1.total).toBe(34); // 30 + 3 + viewer; the platform admin is excluded
    expect(page1.page).toBe(1);
    expect(page1.pageSize).toBe(25);
    expect(page1.items).toHaveLength(25);
    expect(page1.items.slice(0, 4).map((s) => s.lastName)).toEqual(["Alder", "Birch", "Smith", "Viewer"]);
    expect(page1.items[0]).toEqual({
      id: expect.any(String),
      username: "sr.gone",
      email: "sr.gone@ole.augie.edu",
      firstName: "Olivia",
      lastName: "Alder",
      classStanding: "SR",
      onRoster: false,
      updatedAt: expect.any(String),
    });
    expect(page1.items.some((s) => s.username === "admin")).toBe(false);

    const page2 = await list("?page=2");
    expect(page2.items).toHaveLength(9);
    expect(page2.items.at(-1)?.username).toBe("fr29");
  });

  it("filters by roster status and class", async () => {
    expect((await list("?roster=off")).items.map((s) => s.username)).toEqual(["sr.gone"]);
    expect((await list("?roster=on")).total).toBe(33);
    expect((await list("?class=NONE")).items.map((s) => s.username)).toEqual(["noclass"]);
    expect((await list("?class=FR&pageSize=100")).total).toBe(30);
    expect((await list("?class=SR&roster=on")).total).toBe(0);
  });

  it("searches username, email and names case-insensitively", async () => {
    expect((await list("?search=SMITH")).items.map((s) => s.username)).toEqual(["jr.smith"]);
    expect((await list("?search=olivia")).items.map((s) => s.username)).toEqual(["sr.gone"]);
    expect((await list("?search=fr0")).total).toBe(10);
    expect((await list("?search=%20%20")).total).toBe(34); // blank search = no filter
  });

  it("validates query parameters", async () => {
    for (const q of ["?pageSize=101", "?page=0", "?class=XX", "?roster=maybe"]) {
      const res = await admin.get(`/api/admin/students${q}`);
      expect(res.status, q).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    }
  });
});

describe("GET /api/admin/students/stats", () => {
  it("counts students on and off the roster and on-roster students by class", async () => {
    const res = await admin.get("/api/admin/students/stats");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      onRoster: 33,
      offRoster: 1,
      byClass: { FR: 30, SO: 1, JR: 1, SR: 0, GR: 0, NONE: 1 },
      lastImportAt: null,
    });
  });
});
