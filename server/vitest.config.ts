import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { defineConfig } from "vitest/config";

/**
 * Two projects:
 *  - unit         src/tests/**\/*.test.ts      no database, never reads server/.env
 *  - integration  src/tests/**\/*.int.test.ts  real PostgreSQL at TEST_DATABASE_URL
 *
 * The integration project points DATABASE_URL at TEST_DATABASE_URL for its
 * workers, so the app's Prisma client only ever touches the test database.
 * Its globalSetup creates/migrates that database once per run.
 */
const envFile = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".env");
const fileEnv = fs.existsSync(envFile) ? dotenv.parse(fs.readFileSync(envFile)) : {};
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL ?? fileEnv.TEST_DATABASE_URL ?? "";

export default defineConfig({
  test: {
    environment: "node",
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["src/tests/**/*.test.ts"],
          exclude: ["src/tests/**/*.int.test.ts"],
          env: { NODE_ENV: "test" },
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          include: ["src/tests/**/*.int.test.ts"],
          env: {
            NODE_ENV: "test",
            DATABASE_URL: TEST_DATABASE_URL,
            TEST_DATABASE_URL,
            ALLOWED_EMAIL_DOMAINS: "ole.augie.edu",
          },
          globalSetup: ["src/tests/integration/globalSetup.ts"],
          setupFiles: ["src/tests/integration/setup.ts"],
          // One shared database: run test files one at a time (still module-isolated per file).
          pool: "forks",
          poolOptions: { forks: { singleFork: true } },
          testTimeout: 30_000,
          hookTimeout: 60_000,
        },
      },
    ],
  },
});
