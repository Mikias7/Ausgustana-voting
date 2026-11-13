import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export const CSRF_HEADER = "x-requested-with";
export const CSRF_HEADER_VALUE = "fetch";

/**
 * CSRF defence for the cookie-authenticated API.
 *
 * Every state-changing /api request must carry `X-Requested-With: fetch`
 * (the client's fetch wrapper always sends it). A cross-site HTML form cannot
 * set custom headers, and a cross-site fetch that sets one triggers a CORS
 * preflight, which this server never approves for foreign origins. Together
 * with the SameSite=Lax session cookie this blocks cross-site request forgery.
 */
export function requireCsrfHeader(req: Request, _res: Response, next: NextFunction) {
  if (SAFE_METHODS.has(req.method)) return next();
  if (req.get(CSRF_HEADER) !== CSRF_HEADER_VALUE) {
    return next(new AppError(403, "CSRF_HEADER_MISSING", `Missing or invalid X-Requested-With header`));
  }
  next();
}
