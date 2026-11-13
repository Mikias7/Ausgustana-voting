import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, api, isApiError, request } from "./client";

function jsonResponse(body: unknown, status = 200, statusText = "OK") {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    statusText,
    headers: { "Content-Type": "application/json" },
  });
}

describe("api client", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function lastCall() {
    const [url, init] = fetchMock.mock.calls.at(-1)!;
    return { url: String(url), init: init!, headers: init!.headers as Record<string, string> };
  }

  it("GET prefixes /api, builds the query, includes credentials, and omits the CSRF header", async () => {
    fetchMock.mockResolvedValue(jsonResponse([{ id: "1" }]));
    const data = await api.get<{ id: string }[]>("/elections", { phase: "open", org: undefined });

    expect(data).toEqual([{ id: "1" }]);
    const { url, init, headers } = lastCall();
    expect(url).toBe("/api/elections?phase=open");
    expect(init.method).toBe("GET");
    expect(init.credentials).toBe("include");
    expect(headers["X-Requested-With"]).toBeUndefined();
  });

  it("POST sends X-Requested-With: fetch and a JSON body", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }));
    await api.post("/auth/dev/login", { username: "jdoe" });

    const { url, init, headers } = lastCall();
    expect(url).toBe("/api/auth/dev/login");
    expect(init.method).toBe("POST");
    expect(init.credentials).toBe("include");
    expect(headers["X-Requested-With"]).toBe("fetch");
    expect(headers["Content-Type"]).toBe("application/json");
    expect(init.body).toBe(JSON.stringify({ username: "jdoe" }));
  });

  it.each(["PUT", "PATCH", "DELETE"] as const)("%s also sends the CSRF header", async (method) => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await request("/x", { method });
    expect(lastCall().headers["X-Requested-With"]).toBe("fetch");
  });

  it("returns undefined for empty (204) responses", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await expect(api.post("/auth/logout")).resolves.toBeUndefined();
  });

  it("throws ApiError with status, code and message from the error body", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ error: { code: "NOT_ELIGIBLE", message: "Open to Seniors only", details: { x: 1 } } }, 403, "Forbidden"),
    );

    const error = await api.get("/elections/1/ballot").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(isApiError(error, 403)).toBe(true);
    expect(error).toMatchObject({
      status: 403,
      code: "NOT_ELIGIBLE",
      message: "Open to Seniors only",
      details: { x: 1 },
    });
  });

  it("throws a generic ApiError when the error body is not JSON", async () => {
    fetchMock.mockResolvedValue(new Response("<html>Bad gateway</html>", { status: 502, statusText: "Bad Gateway" }));
    const error = await api.get("/health").catch((e: unknown) => e);
    expect(error).toMatchObject({ status: 502, code: "HTTP_ERROR", message: "Bad Gateway" });
  });

  it("wraps network failures in a NETWORK_ERROR ApiError", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    const error = await api.get("/elections").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 0, code: "NETWORK_ERROR" });
  });
});
