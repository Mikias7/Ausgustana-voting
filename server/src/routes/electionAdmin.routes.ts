import { Router } from "express";
import {
  candidateInputSchema,
  electionInputSchema,
  electionUpdateSchema,
  positionInputSchema,
  publishResultsSchema,
  reorderSchema,
  voterListInputSchema,
  voterListMembersSchema,
} from "@asa/shared";
import { validate } from "../middleware/validate";
import { requireAuth } from "../middleware/auth";
import { candidateUpdateSchema, positionUpdateSchema } from "../services/admin/positions.service";
import * as c from "../controllers/electionAdmin.controller";

/**
 * Election management under /api/admin (shared/src/adminElections.ts).
 * Signed-in users only; each service checks the organization permission
 * (platform admin, or ORG_ADMIN / ELECTION_ADMIN of the election's org → else 403).
 * Malformed or unknown ids → 404.
 */
export function electionAdminRoutes(): Router {
  const router = Router();
  router.use(["/organizations/managed", "/elections", "/positions", "/candidates", "/voter-lists"], requireAuth);

  router.get("/organizations/managed", c.getManagedOrganizations);

  // Elections
  router.get("/elections", validate({ query: c.adminElectionListQuery }), c.getAdminElections);
  router.post("/elections", validate({ body: electionInputSchema }), c.postElection);
  router.get("/elections/:id", c.uuidParams("id"), c.getAdminElection);
  router.patch("/elections/:id", c.uuidParams("id"), validate({ body: electionUpdateSchema }), c.patchElection);
  router.delete("/elections/:id", c.uuidParams("id"), c.deleteElection);
  router.post("/elections/:id/publish", c.uuidParams("id"), c.electionTransition("publish"));
  router.post("/elections/:id/unpublish", c.uuidParams("id"), c.electionTransition("unpublish"));
  router.post("/elections/:id/close", c.uuidParams("id"), c.electionTransition("close"));
  router.post("/elections/:id/cancel", c.uuidParams("id"), c.electionTransition("cancel"));
  router.post("/elections/:id/duplicate", c.uuidParams("id"), c.postDuplicate);

  // Results (once voting closes)
  router.get("/elections/:id/results", c.uuidParams("id"), c.getElectionResults);
  router.post(
    "/elections/:id/results/publish",
    c.uuidParams("id"),
    validate({ body: publishResultsSchema }),
    c.postPublishResults,
  );
  router.post("/elections/:id/results/unpublish", c.uuidParams("id"), c.postUnpublishResults);

  // Positions
  router.post("/elections/:id/positions", c.uuidParams("id"), validate({ body: positionInputSchema }), c.postPosition);
  router.put("/elections/:id/positions/order", c.uuidParams("id"), validate({ body: reorderSchema }), c.putPositionOrder);
  router.patch("/positions/:positionId", c.uuidParams("positionId"), validate({ body: positionUpdateSchema }), c.patchPosition);
  router.delete("/positions/:positionId", c.uuidParams("positionId"), c.deletePosition);

  // Candidates
  router.post(
    "/positions/:positionId/candidates",
    c.uuidParams("positionId"),
    validate({ body: candidateInputSchema }),
    c.postCandidate,
  );
  router.put(
    "/positions/:positionId/candidates/order",
    c.uuidParams("positionId"),
    validate({ body: reorderSchema }),
    c.putCandidateOrder,
  );
  router.patch("/candidates/:candidateId", c.uuidParams("candidateId"), validate({ body: candidateUpdateSchema }), c.patchCandidate);
  router.delete("/candidates/:candidateId", c.uuidParams("candidateId"), c.deleteCandidate);

  // Voter lists
  router.get("/voter-lists", validate({ query: c.voterListQuery }), c.getVoterLists);
  router.post("/voter-lists", validate({ body: voterListInputSchema }), c.postVoterList);
  router.get("/voter-lists/:id", c.uuidParams("id"), c.getVoterList);
  router.patch("/voter-lists/:id", c.uuidParams("id"), validate({ body: c.voterListRenameSchema }), c.patchVoterList);
  router.put("/voter-lists/:id/members", c.uuidParams("id"), validate({ body: voterListMembersSchema }), c.putVoterListMembers);
  router.delete("/voter-lists/:id", c.uuidParams("id"), c.deleteVoterList);

  return router;
}
