import { describe, expect, it } from "vitest";
import { parseEnv } from "../config/env";

const base = {
  NODE_ENV: "development",
  DATABASE_URL: "postgresql://user:pass@localhost:5432/asa_voting",
  SESSION_SECRET: "a-development-secret-that-is-long-enough",
  AUTH_MODE: "dev",
};
const PROD_SECRET = "x".repeat(48);

describe("parseEnv", () => {
  it("applies defaults", () => {
    const env = parseEnv(base);
    expect(env).toMatchObject({
      PORT: 3000,
      AUTH_MODE: "dev",
      ALLOWED_EMAIL_DOMAINS: ["ole.augie.edu", "augie.edu"],
      CLIENT_ORIGIN: "http://localhost:5173",
    });
  });

  it("parses PORT and a comma-separated domain list", () => {
    const env = parseEnv({ ...base, PORT: "8080", ALLOWED_EMAIL_DOMAINS: " Ole.Augie.edu, augustana.edu ,," });
    expect(env.PORT).toBe(8080);
    expect(env.ALLOWED_EMAIL_DOMAINS).toEqual(["ole.augie.edu", "augustana.edu"]);
  });

  it("requires DATABASE_URL and SESSION_SECRET", () => {
    expect(() => parseEnv({ NODE_ENV: "development" })).toThrow(/DATABASE_URL[\s\S]*SESSION_SECRET/);
  });

  it("rejects an unknown AUTH_MODE", () => {
    expect(() => parseEnv({ ...base, AUTH_MODE: "magic" })).toThrow(/AUTH_MODE/);
  });

  it("refuses dev auth in production", () => {
    expect(() => parseEnv({ ...base, NODE_ENV: "production", SESSION_SECRET: PROD_SECRET, AUTH_MODE: "dev" })).toThrow(
      /AUTH_MODE=dev is not allowed when NODE_ENV=production/,
    );
  });

  it("refuses the placeholder or a short session secret in production", () => {
    const prod = { ...base, NODE_ENV: "production", AUTH_MODE: "disabled" };
    expect(() => parseEnv({ ...prod, SESSION_SECRET: "CHANGE_ME_CHANGE_ME_CHANGE_ME_CHANGE_ME" })).toThrow(/SESSION_SECRET/);
    expect(() => parseEnv({ ...prod, SESSION_SECRET: "short-but-16-chars" })).toThrow(/SESSION_SECRET/);
    expect(parseEnv({ ...prod, SESSION_SECRET: PROD_SECRET }).NODE_ENV).toBe("production");
  });

  it("allows dev auth outside production", () => {
    expect(parseEnv({ ...base, NODE_ENV: "test" }).AUTH_MODE).toBe("dev");
  });
});
