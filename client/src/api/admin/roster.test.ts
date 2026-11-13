import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getRosterStats, listStudents, postRosterImport } from "./roster";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("roster api", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const lastCall = () => {
    const [url, init] = fetchMock.mock.calls.at(-1)!;
    return { url: String(url), init: init!, headers: init!.headers as Record<string, string> };
  };

  it("posts the roster as multipart FormData with the CSRF header and no manual Content-Type", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: null, dryRun: true }));
    const file = new File(["Doe|Jane|jdoe|jdoe@example.edu|SR\n"], "roster.txt", { type: "text/plain" });

    await postRosterImport({ file, mode: "FULL_SYNC", dryRun: true });

    const { url, init, headers } = lastCall();
    expect(url).toBe("/api/admin/imports?dryRun=true");
    expect(init.method).toBe("POST");
    expect(init.credentials).toBe("include");
    expect(headers["X-Requested-With"]).toBe("fetch");
    expect(headers["Content-Type"]).toBeUndefined();
    expect(init.body).toBeInstanceOf(FormData);
    const form = init.body as FormData;
    expect((form.get("file") as File).name).toBe("roster.txt");
    expect(form.get("mode")).toBe("FULL_SYNC");
    expect(form.has("confirmDestructive")).toBe(false);
  });

  it("commits with dryRun=false and sends confirmDestructive only when asked", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ id: "imp_1", dryRun: false }));
    const file = new File(["x"], "roster.csv");

    await postRosterImport({ file, mode: "FULL_SYNC", dryRun: false, confirmDestructive: true });

    const { url, init } = lastCall();
    expect(url).toBe("/api/admin/imports?dryRun=false");
    expect((init.body as FormData).get("confirmDestructive")).toBe("true");
  });

  it("builds the students query and skips empty filters", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ items: [], page: 2, pageSize: 25, total: 0 }));
    await listStudents({ search: "  ", class: "NONE", roster: "off", page: 2, pageSize: 25 });
    expect(lastCall().url).toBe("/api/admin/students?class=NONE&roster=off&page=2&pageSize=25");

    fetchMock.mockResolvedValue(jsonResponse({ onRoster: 1 }));
    await getRosterStats();
    expect(lastCall().url).toBe("/api/admin/students/stats");
  });
});
