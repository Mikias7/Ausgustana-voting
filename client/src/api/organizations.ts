import type { OrganizationSummary } from "@asa/shared";
import { api } from "./client";

export function listOrganizations(signal?: AbortSignal): Promise<OrganizationSummary[]> {
  return api.get<OrganizationSummary[]>("/organizations", undefined, signal);
}
