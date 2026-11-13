import type { Request } from "express";

/**
 * The seam between auth providers and the rest of the app: every provider
 * (dev picker today, SSO later) verifies identity its own way and then calls
 * signIn(). Nothing else in the codebase knows how a user signed in.
 */
export function signIn(req: Request, userId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // New session id on login prevents session fixation.
    req.session.regenerate((err) => {
      if (err) return reject(err);
      req.session.userId = userId;
      req.session.save((saveErr) => (saveErr ? reject(saveErr) : resolve()));
    });
  });
}

export function signOut(req: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.destroy((err) => (err ? reject(err) : resolve()));
  });
}
