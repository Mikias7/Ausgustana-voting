import path from "node:path";
import { fileURLToPath } from "node:url";
import express, { type Express } from "express";
import helmet from "helmet";
import cors from "cors";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import type { Env } from "./config/env";
import { requireCsrfHeader } from "./middleware/csrf";
import { attachUser } from "./middleware/auth";
import { apiLimiter, contactLimiter, voteLimiter } from "./middleware/rateLimit";
import { createErrorHandler, notFoundHandler } from "./middleware/errorHandler";
import { SESSION_COOKIE_NAME } from "./controllers/auth.controller";
import { apiRoutes } from "./routes";

const SESSION_MAX_AGE_MS = 8 * 60 * 60 * 1000;

// Two levels up from both src/app.ts and the bundled dist/server.js.
const CLIENT_DIST = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../client/dist");

export type AppConfig = Pick<Env, "NODE_ENV" | "AUTH_MODE" | "SESSION_SECRET" | "CLIENT_ORIGIN" | "DATABASE_URL" | "ALLOWED_EMAIL_DOMAINS">;

export interface AppOptions {
  /** Defaults to the PostgreSQL store; tests inject a MemoryStore. */
  sessionStore?: session.Store;
  /** Serve client/dist with an SPA fallback. Defaults to NODE_ENV=production. */
  serveClient?: boolean;
}

export function createPgSessionStore(databaseUrl: string): session.Store {
  const PgStore = connectPgSimple(session);
  // The "session" table is created by Prisma migrations, not by the store.
  return new PgStore({ conString: databaseUrl, tableName: "session", createTableIfMissing: false });
}

export function createApp(config: AppConfig, options: AppOptions = {}): Express {
  const isProduction = config.NODE_ENV === "production";
  const app = express();

  app.disable("x-powered-by");
  // Behind Apache in production: trust exactly one proxy hop for req.ip / secure cookies.
  if (isProduction) app.set("trust proxy", 1);

  app.use(helmet());
  if (config.NODE_ENV === "development") {
    app.use(cors({ origin: config.CLIENT_ORIGIN, credentials: true }));
  }
  app.use(express.json({ limit: "100kb" }));

  app.use(
    session({
      name: SESSION_COOKIE_NAME,
      store: options.sessionStore ?? createPgSessionStore(config.DATABASE_URL),
      secret: config.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: { httpOnly: true, sameSite: "lax", secure: isProduction, maxAge: SESSION_MAX_AGE_MS },
    }),
  );

  // --- API ---
  app.use("/api", apiLimiter);
  app.use("/api", requireCsrfHeader);
  app.use("/api/elections/:id/vote", voteLimiter);
  app.use("/api/contact", contactLimiter);
  app.use("/api", attachUser);
  app.use("/api", apiRoutes(config));
  app.use("/api", notFoundHandler);

  // --- Built React app (production) ---
  if (options.serveClient ?? isProduction) {
    app.use(express.static(CLIENT_DIST, { index: false, maxAge: "1h" }));
    // SPA fallback: React Router handles every non-API path.
    app.get("/{*path}", (_req, res) => res.sendFile(path.join(CLIENT_DIST, "index.html")));
  }

  app.use(notFoundHandler);
  app.use(createErrorHandler({ exposeInternals: !isProduction }));

  return app;
}
