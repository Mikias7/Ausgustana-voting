import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/tests/**/*.test.ts"],
    // Tests never read server/.env; each test supplies what it needs.
    env: { NODE_ENV: "test" },
  },
});
