import { useCallback, useEffect, useRef, useState } from "react";
import type {
  AdminElectionDetail,
  AdminElectionSummary,
  CandidateInput,
  ElectionUpdate,
  ManagedOrganization,
  PositionInput,
} from "@asa/shared";
import {
  createCandidate,
  createPosition,
  deleteCandidate,
  deleteElection,
  deletePosition,
  duplicateElection,
  getAdminElection,
  listAdminElections,
  listManagedOrganizations,
  reorderCandidates,
  reorderPositions,
  runElectionAction,
  updateCandidate,
  updateElection,
  updatePosition,
  type AdminElectionFilters,
  type ElectionLifecycleAction,
} from "../api/admin/elections";
import { useAsync, type AsyncState } from "./useAsync";

export function useManagedOrganizations(): AsyncState<ManagedOrganization[]> {
  return useAsync((signal) => listManagedOrganizations(signal), []);
}

export function useAdminElections(
  filters: AdminElectionFilters = {},
  options: { enabled?: boolean } = {},
): AsyncState<AdminElectionSummary[]> {
  const { org, status } = filters;
  return useAsync((signal) => listAdminElections({ org, status }, signal), [org, status], options);
}

export interface AdminElectionState {
  election: AdminElectionDetail | undefined;
  error: unknown;
  loading: boolean;
  /** Re-fetches the detail without clearing what's shown. */
  refresh: () => Promise<AdminElectionDetail | undefined>;
  update: (patch: ElectionUpdate) => Promise<void>;
  lifecycle: (action: ElectionLifecycleAction) => Promise<void>;
  remove: () => Promise<void>;
  duplicate: () => Promise<AdminElectionDetail>;
  addPosition: (input: PositionInput) => Promise<void>;
  editPosition: (positionId: string, input: Partial<PositionInput>) => Promise<void>;
  removePosition: (positionId: string) => Promise<void>;
  movePositions: (ids: string[]) => Promise<void>;
  addCandidate: (positionId: string, input: CandidateInput) => Promise<void>;
  editCandidate: (candidateId: string, input: Partial<CandidateInput>) => Promise<void>;
  removeCandidate: (candidateId: string) => Promise<void>;
  moveCandidates: (positionId: string, ids: string[]) => Promise<void>;
}

/**
 * One election for the editor, plus mutation helpers. Every structural mutation refreshes
 * the detail afterwards — also when it fails, so a 409 ELECTION_LOCKED shows the locked state.
 */
export function useAdminElection(id: string | undefined): AdminElectionState {
  const [election, setElection] = useState<AdminElectionDetail>();
  const [error, setError] = useState<unknown>();
  const [loading, setLoading] = useState(true);
  const idRef = useRef(id);
  idRef.current = id;

  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    setLoading(true);
    setError(undefined);
    setElection(undefined);
    getAdminElection(id, controller.signal).then(
      (data) => {
        setElection(data);
        setLoading(false);
      },
      (err: unknown) => {
        if (controller.signal.aborted) return;
        setError(err);
        setLoading(false);
      },
    );
    return () => controller.abort();
  }, [id]);

  const refresh = useCallback(async () => {
    const current = idRef.current;
    if (!current) return undefined;
    try {
      const data = await getAdminElection(current);
      if (idRef.current === current) setElection(data);
      return data;
    } catch {
      return undefined;
    }
  }, []);

  const withRefresh = useCallback(
    <A extends unknown[]>(fn: (...args: A) => Promise<unknown>) =>
      async (...args: A) => {
        try {
          await fn(...args);
        } finally {
          await refresh();
        }
      },
    [refresh],
  );

  const electionId = id ?? "";
  return {
    election,
    error,
    loading,
    refresh,
    update: withRefresh((patch: ElectionUpdate) => updateElection(electionId, patch)),
    lifecycle: withRefresh((action: ElectionLifecycleAction) => runElectionAction(electionId, action)),
    remove: () => deleteElection(electionId),
    duplicate: () => duplicateElection(electionId),
    addPosition: withRefresh((input: PositionInput) => createPosition(electionId, input)),
    editPosition: withRefresh((positionId: string, input: Partial<PositionInput>) => updatePosition(positionId, input)),
    removePosition: withRefresh((positionId: string) => deletePosition(positionId)),
    movePositions: withRefresh((ids: string[]) => reorderPositions(electionId, ids)),
    addCandidate: withRefresh((positionId: string, input: CandidateInput) => createCandidate(positionId, input)),
    editCandidate: withRefresh((candidateId: string, input: Partial<CandidateInput>) =>
      updateCandidate(candidateId, input),
    ),
    removeCandidate: withRefresh((candidateId: string) => deleteCandidate(candidateId)),
    moveCandidates: withRefresh((positionId: string, ids: string[]) => reorderCandidates(positionId, ids)),
  };
}
