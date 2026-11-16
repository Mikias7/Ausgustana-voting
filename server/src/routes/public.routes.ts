import { Router } from "express";
import { validate } from "../middleware/validate";
import { requireAuth } from "../middleware/auth";
import { ballotSubmissionSchema, receiptCheckSchema } from "@asa/shared";
import { postReceiptCheck, postVote } from "../controllers/vote.controller";
import {
  electionListQuery,
  getAnnouncements,
  getElection,
  getElections,
  getMe,
  getOrganizations,
  getResults,
} from "../controllers/public.controller";

export function publicRoutes(): Router {
  const router = Router();

  router.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  router.get("/elections", validate({ query: electionListQuery }), getElections);
  router.get("/elections/:id", getElection);
  router.get("/elections/:id/results", getResults);
  router.post("/elections/:id/vote", requireAuth, validate({ body: ballotSubmissionSchema }), postVote);
  router.post("/receipts/check", validate({ body: receiptCheckSchema }), postReceiptCheck);
  router.get("/organizations", getOrganizations);
  router.get("/announcements", getAnnouncements);
  router.get("/me", requireAuth, getMe);

  return router;
}
