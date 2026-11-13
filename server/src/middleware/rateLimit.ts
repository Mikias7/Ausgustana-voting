import { rateLimit, type Options } from "express-rate-limit";
import { AppError } from "../utils/AppError";

function limiter(windowMs: number, limit: number, overrides: Partial<Options> = {}) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    handler: (_req, _res, next) =>
      next(new AppError(429, "RATE_LIMITED", "Too many requests. Please wait a moment and try again.")),
    ...overrides,
  });
}

const MINUTE = 60_000;

/**
 * Signed-in requests are counted per user, anonymous ones per IP. Many students
 * share a few campus NAT addresses, so per-IP limits alone would block real voters.
 */
const byUserOrIp: Options["keyGenerator"] = (req) => {
  const userId = (req as { session?: { userId?: string } }).session?.userId;
  return userId ? `user:${userId}` : `ip:${req.ip}`;
};

/** Applied to every /api request. */
export const apiLimiter = limiter(15 * MINUTE, 600, { keyGenerator: byUserOrIp });
/** Sign-in attempts. */
export const authLimiter = limiter(15 * MINUTE, 30);
/** Ballot submissions (only successful-or-not POSTs count). */
export const voteLimiter = limiter(MINUTE, 10, { keyGenerator: byUserOrIp, skip: (req) => req.method !== "POST" });
/** Public contact form. */
export const contactLimiter = limiter(60 * MINUTE, 5, { skip: (req) => req.method !== "POST" });
/** Receipt-code checks (codes have 60 random bits; this just keeps scanners away). */
export const receiptLimiter = limiter(15 * MINUTE, 30, { skip: (req) => req.method !== "POST" });
