import type { CurrentUser } from "@asa/shared";

/** Platform admins and anyone holding an organization role can open /admin. */
export function canAccessAdmin(user: CurrentUser | null | undefined): boolean {
  if (!user) return false;
  return user.platformRole === "PLATFORM_ADMIN" || user.orgRoles.length > 0;
}

export function isPlatformAdmin(user: CurrentUser | null | undefined): boolean {
  return user?.platformRole === "PLATFORM_ADMIN";
}

/**
 * Validates a `?next=` redirect target. Only same-site absolute paths are allowed,
 * which prevents open redirects such as `//evil.example` or `https://…`.
 */
export function safeNextPath(next: string | null | undefined, fallback = "/"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return fallback;
  }
  if (next.startsWith("/login")) return fallback;
  return next;
}

export function loginPath(next: string): string {
  return `/login?next=${encodeURIComponent(next)}`;
}
