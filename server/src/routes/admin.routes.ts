import { Router } from "express";
import type { Env } from "../config/env";
import { validate } from "../middleware/validate";
import { requirePlatformAdmin } from "../middleware/auth";
import { rosterUpload } from "../middleware/upload";
import { electionAdminRoutes } from "./electionAdmin.routes";
import {
  getImport,
  getImports,
  getStudents,
  getStudentStats,
  importBody,
  importParams,
  importQuery,
  postImport,
  studentListQuery,
} from "../controllers/admin.controller";

/**
 * /api/admin — election management (organization-scoped, see
 * electionAdmin.routes.ts) first, then platform-administrator-only routes.
 */
export function adminRoutes(env: Pick<Env, "ALLOWED_EMAIL_DOMAINS">): Router {
  const router = Router();
  router.use(electionAdminRoutes());

  // Everything below: platform administrators only.
  router.use(requirePlatformAdmin);

  /**
   * POST /api/admin/imports?dryRun=true|false   (dryRun defaults to true)
   * multipart/form-data:
   *   file               roster .txt/.csv, UTF-8, max 2 MB (memory only, never stored)
   *   mode               MERGE (default) | FULL_SYNC
   *   confirmDestructive "true" to commit a FULL_SYNC that would take more than
   *                      50% of on-roster students off the roster; without it the
   *                      commit fails with 400 IMPORT_SYNC_TOO_DESTRUCTIVE
   *                      (details: { deactivated, onRoster, thresholdRatio }).
   *                      Dry runs are never refused by this guard.
   * → ImportSummary (200 dry run, 201 committed).
   * Errors: 400 FILE_REQUIRED | UNSUPPORTED_FILE_TYPE | INVALID_FILE_ENCODING |
   *         IMPORT_EMPTY (details.issues) | IMPORT_SYNC_TOO_DESTRUCTIVE | VALIDATION_ERROR,
   *         413 FILE_TOO_LARGE.
   */
  router.post(
    "/imports",
    validate({ query: importQuery }),
    rosterUpload,
    validate({ body: importBody }),
    postImport(env),
  );
  router.get("/imports", getImports);
  router.get("/imports/:id", validate({ params: importParams }), getImport);

  router.get("/students", validate({ query: studentListQuery }), getStudents);
  router.get("/students/stats", getStudentStats);

  return router;
}
