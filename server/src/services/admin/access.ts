import type { ManagedOrganization } from "@asa/shared";
import { prisma } from "../../utils/prisma";
import { AppError } from "../../utils/AppError";
import { isPlatformAdmin, type AuthUser } from "../auth/currentUser";

/**
 * Election-management permission: platform admins manage every organization;
 * ORG_ADMIN / ELECTION_ADMIN manage only their own organization.
 */
export function canManageOrg(user: AuthUser, organizationId: string): boolean {
  return isPlatformAdmin(user) || user.orgRoles.some((r) => r.organizationId === organizationId);
}

export function assertCanManageOrg(user: AuthUser, organizationId: string): void {
  if (!canManageOrg(user, organizationId)) throw AppError.forbidden();
}

/** Organization ids the user manages, or null meaning "all" (platform admin). */
export function managedOrgIds(user: AuthUser): string[] | null {
  if (isPlatformAdmin(user)) return null;
  return user.orgRoles.map((r) => r.organizationId);
}

export async function listManagedOrganizations(user: AuthUser): Promise<ManagedOrganization[]> {
  if (isPlatformAdmin(user)) {
    const orgs = await prisma.organization.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, slug: true } });
    return orgs.map((o) => ({ ...o, role: null }));
  }
  const roles = await prisma.organizationRole.findMany({
    where: { userId: user.id },
    include: { organization: { select: { id: true, name: true, slug: true } } },
    orderBy: { organization: { name: "asc" } },
  });
  return roles.map((r) => ({ ...r.organization, role: r.role }));
}

/**
 * Resolves an optional ?org=slug filter to the organization ids to query.
 * Unknown slug → 404; an organization the user does not manage → 403.
 * Returns null for "every organization" (platform admin, no filter).
 */
export async function resolveOrgFilter(user: AuthUser, slug: string | undefined): Promise<string[] | null> {
  const managed = managedOrgIds(user);
  if (!slug) return managed;
  const org = await prisma.organization.findUnique({ where: { slug }, select: { id: true } });
  if (!org) throw AppError.notFound("Organization not found");
  assertCanManageOrg(user, org.id);
  return [org.id];
}
