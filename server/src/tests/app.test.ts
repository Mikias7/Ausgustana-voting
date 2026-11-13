/**
 * HTTP-level tests that never reach the database: every request here is
 * answered by middleware (CSRF, validation, auth, 404) before any query.
 */
import { describe, expect, it } from "vitest";
import request from "supertest";
import session from "express-session";
import { createApp, type AppConfig } from "../app";

const config: AppConfig = {
  NODE_ENV: "test",
  AUTH_MODE: "dev",
  SESSION_SECRET: "test-secret-that-is-long-enough",
  CLIENT_ORIGIN: "http://localhost:5173",
  DATABASE_URL: "postgresql://unused:unused@localhost:5432/unused",
  ALLOWED_EMAIL_DOMAINS: ["ole.augie.edu"],
};

const makeApp = (overrides: Partial<AppConfig> = {}) =>
  createApp({ ...config, ...overrides }, { sessionStore: new session.MemoryStore(), serveClient: false });

describe("CSRF header", () => {
  const app = makeApp();

  it("rejects state-changing requests without X-Requested-With", async () => {
    const res = await request(app).post("/api/auth/logout");
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: { code: "CSRF_HEADER_MISSING", message: expect.any(String) } });
  });

  it("rejects a wrong header value", async () => {
    const res = await request(app).post("/api/auth/logout").set("X-Requested-With", "XMLHttpRequest");
    expect(res.status).toBe(403);
  });

  it.each(["put", "patch", "delete"] as const)("also guards %s", async (method) => {
    const res = await request(app)[method]("/api/anything");
    expect(res.status).toBe(403);
  });

  it("allows requests that carry the header", async () => {
    const res = await request(app).post("/api/auth/logout").set("X-Requested-With", "fetch");
    expect(res.status).toBe(204);
  });

  it("does not require the header for GET", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });
});

describe("error handling", () => {
  const app = makeApp();

  it("returns JSON 404 for unknown API routes", async () => {
    const res = await request(app).get("/api/does-not-exist");
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  it("maps zod validation errors to 400 VALIDATION_ERROR", async () => {
    const res = await request(app).post("/api/auth/dev/login").set("X-Requested-With", "fetch").send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.details).toEqual([{ path: "username", message: expect.any(String) }]);
  });

  it("rejects an invalid query parameter", async () => {
    const res = await request(app).get("/api/elections?phase=someday");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 INVALID_JSON for a malformed body", async () => {
    const res = await request(app)
      .post("/api/auth/dev/login")
      .set("X-Requested-With", "fetch")
      .set("Content-Type", "application/json")
      .send("{not json");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_JSON");
  });

  it("treats a malformed election id as not found", async () => {
    const res = await request(app).get("/api/elections/not-a-uuid");
    expect(res.status).toBe(404);
  });

  it("sets security headers", async () => {
    const res = await request(app).get("/api/health");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-powered-by"]).toBeUndefined();
  });
});

describe("authentication", () => {
  const app = makeApp();

  it("GET /api/auth/me is 401 when signed out", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("GET /api/me requires sign-in", async () => {
    expect((await request(app).get("/api/me")).status).toBe(401);
  });

  it("does not register dev routes unless AUTH_MODE=dev", async () => {
    const prodLike = makeApp({ AUTH_MODE: "disabled" });
    expect((await request(prodLike).get("/api/auth/dev/users")).status).toBe(404);
    const res = await request(prodLike).post("/api/auth/dev/login").set("X-Requested-With", "fetch").send({ username: "admin" });
    expect(res.status).toBe(404);
  });
});

describe("CORS", () => {
  it("is enabled only in development, for the client origin", async () => {
    const dev = makeApp({ NODE_ENV: "development" });
    const res = await request(dev).get("/api/health").set("Origin", "http://localhost:5173");
    expect(res.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
    expect(res.headers["access-control-allow-credentials"]).toBe("true");

    const test = makeApp();
    const res2 = await request(test).get("/api/health").set("Origin", "http://localhost:5173");
    expect(res2.headers["access-control-allow-origin"]).toBeUndefined();
  });
});
