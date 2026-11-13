import type { VoterListDetail, VoterListSummary } from "@asa/shared";
import { getVoterList, listVoterLists } from "../api/admin/voterLists";
import { useAsync, type AsyncState } from "./useAsync";

/** Voter lists the user manages; pass an organization slug to narrow (e.g. an election's org). */
export function useVoterLists(org?: string, options: { enabled?: boolean } = {}): AsyncState<VoterListSummary[]> {
  return useAsync((signal) => listVoterLists(org, signal), [org], options);
}

export function useVoterList(id: string | undefined): AsyncState<VoterListDetail> {
  return useAsync((signal) => getVoterList(id!, signal), [id], { enabled: Boolean(id) });
}
