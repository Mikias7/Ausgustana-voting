import type { Prisma } from "@prisma/client";
import type { CurrentUser } from "@asa/shared";
import { prisma } from "../../utils/prisma";

const authUserInclude = {
  orgRoles: { include: { organization: { select: { slug: true } } } },
} satisfies Prisma.UserInclude;

/** The signed-in user as loaded for each request (internal shape). */
export type AuthUser = Prisma.UserGetPayload<{ include: typeof authUserInclude }>;

export function findAuthUserById(id: string): Promise<AuthUser | null> {
  return prisma.user.findUnique({ where: { id }, include: authUserInclude });
}

export function findAuthUserByUsername(username: string): Promise<AuthUser | null> {
  return prisma.user.findUnique({ where: { username: username.toLowerCase() }, include: authUserInclude });
}

export function toCurrentUser(user: AuthUser): CurrentUser {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    classStanding: user.classStanding,
    onRoster: user.onRoster,
    platformRole: user.platformRole,
    orgRoles: user.orgRoles.map((r) => ({
      organizationId: r.organizationId,
      organizationSlug: r.organization.slug,
      role: r.role,
    })),
  };
}

export function isPlatformAdmin(user: AuthUser | undefined): boolean {
  return user?.platformRole === "PLATFORM_ADMIN";
}

/** True when the user is a platform admin or holds any role in the organization. */
export function canAdministerOrg(user: AuthUser | undefined, organizationId: string): boolean {
  if (!user) return false;
  return isPlatformAdmin(user) || user.orgRoles.some((r) => r.organizationId === organizationId);
}
