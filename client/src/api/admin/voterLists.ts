import type { VoterListDetail, VoterListSummary } from "@asa/shared";
import { api } from "../client";

export const VOTER_LIST_ERROR_CODES = { inUse: "VOTER_LIST_IN_USE" } as const;

const enc = encodeURIComponent;

/** Voter lists the user manages; `org` (organization slug) narrows to one organization. */
export function listVoterLists(org?: string, signal?: AbortSignal): Promise<VoterListSummary[]> {
  return api.get<VoterListSummary[]>("/admin/voter-lists", { org }, signal);
}

export function getVoterList(id: string, signal?: AbortSignal): Promise<VoterListDetail> {
  return api.get<VoterListDetail>(`/admin/voter-lists/${enc(id)}`, undefined, signal);
}

export function createVoterList(input: { organizationId: string; name: string }): Promise<VoterListDetail> {
  return api.post<VoterListDetail>("/admin/voter-lists", input);
}

export function renameVoterList(id: string, name: string): Promise<VoterListDetail> {
  return api.patch<VoterListDetail>(`/admin/voter-lists/${enc(id)}`, { name });
}

/** 409 VOTER_LIST_IN_USE when an election or position still uses it. */
export function deleteVoterList(id: string): Promise<void> {
  return api.delete<void>(`/admin/voter-lists/${enc(id)}`);
}

/** Replaces the whole member list. */
export function setVoterListMembers(id: string, usernames: string[]): Promise<VoterListDetail> {
  return api.put<VoterListDetail>(`/admin/voter-lists/${enc(id)}/members`, { usernames });
}
