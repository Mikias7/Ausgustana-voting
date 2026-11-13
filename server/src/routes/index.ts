import { Router } from "express";
import type { Env } from "../config/env";
import { authRoutes } from "./auth.routes";
import { publicRoutes } from "./public.routes";
import { adminRoutes } from "./admin.routes";

/** Everything mounted under /api. */
export function apiRoutes(env: Pick<Env, "AUTH_MODE" | "ALLOWED_EMAIL_DOMAINS">): Router {
  const router = Router();
  router.use("/auth", authRoutes(env));
  router.use("/admin", adminRoutes(env));
  router.use(publicRoutes());
  return router;
}
