import { getEnv } from "./config/env";
import { createApp, createPgSessionStore } from "./app";
import { prisma } from "./utils/prisma";

const env = getEnv();
const sessionStore = createPgSessionStore(env.DATABASE_URL);
const app = createApp(env, { sessionStore });

const server = app.listen(env.PORT, () => {
  console.log(`ASA voting server listening on http://localhost:${env.PORT} (${env.NODE_ENV}, auth: ${env.AUTH_MODE})`);
});

function shutdown(signal: string) {
  console.log(`${signal} received, shutting down…`);
  server.close(async () => {
    await prisma.$disconnect();
    // connect-pg-simple owns a pg pool; close() ends it.
    (sessionStore as unknown as { close?: () => void }).close?.();
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
