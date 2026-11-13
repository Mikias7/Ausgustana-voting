import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { TestProject } from "vitest/node";

const SERVER_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

/**
 * Runs once before the integration project: applies migrations to the test
 * database (creating it if needed). Refuses anything that does not look like
 * a dedicated test database, because the tests truncate every table.
 */
export default function setup(project: TestProject) {
  // test.env (vitest.config.ts) reaches the workers, not this main-process hook.
  const url = project.config.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error("TEST_DATABASE_URL is not set (server/.env). Integration tests need a dedicated test database.");
  }
  const dbName = new URL(url).pathname.replace(/^\//, "");
  if (!/test/i.test(dbName)) {
    throw new Error(`Refusing to run integration tests against "${dbName}": the database name must contain "test".`);
  }

  execSync("npx prisma migrate deploy", {
    cwd: SERVER_DIR,
    env: { ...process.env, DATABASE_URL: url },
    stdio: ["ignore", "ignore", "inherit"],
  });
}
