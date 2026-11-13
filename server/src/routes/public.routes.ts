import { Router } from "express";
import { validate } from "../middleware/validate";
import { requireAuth } from "../middleware/auth";
import {
  electionListQuery,
  getAnnouncements,
  getElection,
  getElections,
  getMe,
  getOrganizations,
} from "../controllers/public.controller";

export function publicRoutes(): Router {
  const router = Router();

  router.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  router.get("/elections", validate({ query: electionListQuery }), getElections);
  router.get("/elections/:id", getElection);
  router.get("/organizations", getOrganizations);
  router.get("/announcements", getAnnouncements);
  router.get("/me", requireAuth, getMe);

  return router;
}
