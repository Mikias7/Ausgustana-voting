import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { OrgRole } from "@asa/shared";
import { AppError } from "../utils/AppError";
import { findAuthUserById, isPlatformAdmin } from "../services/auth/currentUser";

/** Loads req.user from the session (if any). Runs on every /api request. */
export const attachUser: RequestHandler = async (req, _res, next) => {
  const userId = req.session?.userId;
  if (!userId) return next();

  const user = await findAuthUserById(userId);
  if (user) {
    req.user = user;
  } else {
    // The account was removed; drop the stale session id.
    delete req.session.userId;
  }
  next();
};

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) return next(AppError.unauthorized());
  next();
}

export function requirePlatformAdmin(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) return next(AppError.unauthorized());
  if (!isPlatformAdmin(req.user)) return next(AppError.forbidden());
  next();
}

/**
 * Allows platform admins, or users holding one of `roles` in the organization
 * returned by `orgIdFrom` (which may look the org up, e.g. from an election id).
 */
export function requireOrgRole(
  orgIdFrom: (req: Request) => string | Promise<string>,
  roles: readonly OrgRole[] = ["ORG_ADMIN", "ELECTION_ADMIN"],
): RequestHandler {
  return async (req, _res, next) => {
    const user = req.user;
    if (!user) return next(AppError.unauthorized());
    if (isPlatformAdmin(user)) return next();

    const organizationId = await orgIdFrom(req);
    const allowed = user.orgRoles.some((r) => r.organizationId === organizationId && roles.includes(r.role));
    if (!allowed) return next(AppError.forbidden());
    next();
  };
}
