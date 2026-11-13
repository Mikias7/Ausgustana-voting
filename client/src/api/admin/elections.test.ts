import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createCandidate,
  createElection,
  createPosition,
  deleteCandidate,
  deleteElection,
  deletePosition,
  duplicateElection,
  getAdminElection,
  listAdminElections,
  listManagedOrganizations,
  reorderCandidates,
  reorderPositions,
  runElectionAction,
  updateCandidate,
  updateElection,
  updatePosition,
} from "./elections";
import {
  createVoterList,
  deleteVoterList,
  getVoterList,
  listVoterLists,
  renameVoterList,
  setVoterListMembers,
} from "./voterLists";

function jsonResponse(body: unknown, status = 200) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("admin election + voter list api", () => {
  const fetchMock = vi.fn<typeof fetch>();
  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockImplementation(async () => jsonResponse({}));
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  const last = () => {
    const [url, init] = fetchMock.mock.calls.at(-1)!;
    const headers = init!.headers as Record<string, string>;
    return {
      call: `${init!.method} ${String(url)}`,
      body: init!.body ? JSON.parse(String(init!.body)) : undefined,
      csrf: headers["X-Requested-With"],
    };
  };

  it("reads without the CSRF header", async () => {
    await listManagedOrganizations();
    expect(last()).toEqual({ call: "GET /api/admin/organizations/managed", body: undefined, csrf: undefined });
    await listAdminElections({ org: "asa" });
    expect(last().call).toBe("GET /api/admin/elections?org=asa");
    await listAdminElections();
    expect(last().call).toBe("GET /api/admin/elections");
    await getAdminElection("e1");
    expect(last().call).toBe("GET /api/admin/elections/e1");
    await listVoterLists("outdoors");
    expect(last().call).toBe("GET /api/admin/voter-lists?org=outdoors");
    await getVoterList("l1");
    expect(last().call).toBe("GET /api/admin/voter-lists/l1");
  });

  it.each([
    ["create election", () => createElection({ title: "T" } as never), "POST /api/admin/elections", { title: "T" }],
    ["update election", () => updateElection("e1", { title: "New" }), "PATCH /api/admin/elections/e1", { title: "New" }],
    ["publish", () => runElectionAction("e1", "publish"), "POST /api/admin/elections/e1/publish", undefined],
    ["close", () => runElectionAction("e1", "close"), "POST /api/admin/elections/e1/close", undefined],
    ["duplicate", () => duplicateElection("e1"), "POST /api/admin/elections/e1/duplicate", undefined],
    ["create position", () => createPosition("e1", { title: "P" } as never), "POST /api/admin/elections/e1/positions", { title: "P" }],
    ["update position", () => updatePosition("p1", { seats: 2 }), "PATCH /api/admin/positions/p1", { seats: 2 }],
    ["reorder positions", () => reorderPositions("e1", ["b", "a"]), "PUT /api/admin/elections/e1/positions/order", { ids: ["b", "a"] }],
    ["create candidate", () => createCandidate("p1", { name: "Ann" }), "POST /api/admin/positions/p1/candidates", { name: "Ann" }],
    ["update candidate", () => updateCandidate("c1", { bio: null }), "PATCH /api/admin/candidates/c1", { bio: null }],
    ["reorder candidates", () => reorderCandidates("p1", ["c2", "c1"]), "PUT /api/admin/positions/p1/candidates/order", { ids: ["c2", "c1"] }],
    ["create list", () => createVoterList({ organizationId: "o1", name: "Intl" }), "POST /api/admin/voter-lists", { organizationId: "o1", name: "Intl" }],
    ["rename list", () => renameVoterList("l1", "New"), "PATCH /api/admin/voter-lists/l1", { name: "New" }],
    ["set members", () => setVoterListMembers("l1", ["a", "b"]), "PUT /api/admin/voter-lists/l1/members", { usernames: ["a", "b"] }],
  ])("%s sends the right method, path and body with the CSRF header", async (_name, run, call, body) => {
    await run();
    expect(last()).toEqual({ call, body, csrf: "fetch" });
  });

  it("deletes with 204 responses", async () => {
    fetchMock.mockImplementation(async () => new Response(null, { status: 204 }));
    await deleteElection("e1");
    expect(last()).toEqual({ call: "DELETE /api/admin/elections/e1", body: undefined, csrf: "fetch" });
    await deletePosition("p1");
    expect(last().call).toBe("DELETE /api/admin/positions/p1");
    await deleteCandidate("c1");
    expect(last().call).toBe("DELETE /api/admin/candidates/c1");
    await deleteVoterList("l1");
    expect(last().call).toBe("DELETE /api/admin/voter-lists/l1");
  });

  it("surfaces PUBLISH_BLOCKED with its issues", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        { error: { code: "PUBLISH_BLOCKED", message: "Not ready", details: { issues: [{ code: "NO_POSITIONS", message: "x" }] } } },
        400,
      ),
    );
    await expect(runElectionAction("e1", "publish")).rejects.toMatchObject({
      status: 400,
      code: "PUBLISH_BLOCKED",
      details: { issues: [{ code: "NO_POSITIONS" }] },
    });
  });
});
