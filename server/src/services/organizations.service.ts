import type { OrganizationSummary } from "@asa/shared";
import { prisma } from "../utils/prisma";

export function listOrganizations(): Promise<OrganizationSummary[]> {
  return prisma.organization.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true, description: true, contactEmail: true },
  });
}
