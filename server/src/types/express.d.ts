import type { AuthUser } from "../services/auth/currentUser";

declare global {
  namespace Express {
    interface Request {
      /** Set by the attachUser middleware when the session belongs to an existing user. */
      user?: AuthUser;
    }
  }
}

export {};
