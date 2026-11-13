import session from "express-session";
import request from "supertest";
import type { Express } from "express";
import { createApp, type AppConfig } from "../../app";
import { prisma } from "../../utils/prisma";
import { resetDatabase } from "./db";

export const config: AppConfig = {
  NODE_ENV: "test",
  AUTH_MODE: "dev",
  SESSION_SECRET: "integration-test-secret-long-enough",
  CLIENT_ORIGIN: "http://localhost:5173",
  DATABASE_URL: process.env.DATABASE_URL ?? "",
  ALLOWED_EMAIL_DOMAINS: ["ole.augie.edu"],
};

export function makeApp(): Express {
  return createApp(config, { sessionStore: new session.MemoryStore(), serveClient: false });
}

/** Fixed ids, so sessions created once per file survive resetDatabase() + seedBaseUsers(). */
export const ADMIN_ID = "00000000-0000-4000-8000-000000000001";
export const STUDENT_ID = "00000000-0000-4000-8000-000000000002";

/** A platform admin ("admin", on the roster) and a plain student ("viewer", on the roster). */
export async function seedBaseUsers(): Promise<void> {
  await prisma.user.createMany({
    data: [
      {
        id: ADMIN_ID,
        username: "admin",
        email: "admin@augustana.edu",
        firstName: "Platform",
        lastName: "Admin",
        platformRole: "PLATFORM_ADMIN",
        onRoster: true,
      },
      {
        id: STUDENT_ID,
        username: "viewer",
        email: "viewer@ole.augie.edu",
        firstName: "Vera",
        lastName: "Viewer",
        classStanding: "SO",
        onRoster: true,
      },
    ],
  });
}

export async function resetWithBaseUsers(): Promise<void> {
  await resetDatabase();
  await seedBaseUsers();
}

/** A supertest agent signed in through the dev login (cookie kept by the agent). */
export async function signedInAgent(app: Express, username: string) {
  const agent = request.agent(app);
  const res = await agent.post("/api/auth/dev/login").set("X-Requested-With", "fetch").send({ username });
  if (res.status !== 200) throw new Error(`dev login as ${username} failed: ${res.status} ${JSON.stringify(res.body)}`);
  return agent;
}

/** One roster line: Lastname|Firstname|username|email|class */
export function rosterLine(username: string, opts: { first?: string; last?: string; email?: string; cls?: string } = {}) {
  return [
    opts.last ?? `Last-${username}`,
    opts.first ?? `First-${username}`,
    username,
    opts.email ?? `${username}@ole.augie.edu`,
    opts.cls ?? "SO",
  ].join("|");
}

export const roster = (...lines: string[]) => lines.join("\r\n") + "\r\n";
