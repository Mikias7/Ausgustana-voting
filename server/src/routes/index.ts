import { Router } from "express";
import type { Env } from "../config/env";
import { authRoutes } from "./auth.routes";
import { publicRoutes } from "./public.routes";

/** Everything mounted under /api. */
export function apiRoutes(env: Pick<Env, "AUTH_MODE">): Router {
  const router = Router();
  router.use("/auth", authRoutes(env));
  router.use(publicRoutes());
  return router;
}
