import { Router } from "express";
import type { Env } from "../config/env";
import { validate } from "../middleware/validate";
import { authLimiter } from "../middleware/rateLimit";
import { devLogin, devLoginBody, devUsers, logout, me } from "../controllers/auth.controller";

/**
 * /api/auth. Provider-specific routes are mounted by AUTH_MODE; only the dev
 * picker exists today. A future SSO provider adds its own sub-router here and
 * calls signIn() (services/auth/session.ts) once identity is verified.
 */
export function authRoutes(env: Pick<Env, "AUTH_MODE">): Router {
  const router = Router();

  router.get("/me", me);
  router.post("/logout", logout);

  if (env.AUTH_MODE === "dev") {
    router.get("/dev/users", devUsers);
    router.post("/dev/login", authLimiter, validate({ body: devLoginBody }), devLogin);
  }

  return router;
}
