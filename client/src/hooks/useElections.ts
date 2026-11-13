import { listElections, type ElectionListPhase } from "../api/elections";
import { useAuth } from "../context/AuthContext";
import { useAsync, type AsyncState } from "./useAsync";
import type { ElectionSummary } from "@asa/shared";

/**
 * Published elections for a phase. Waits for the session check so `myStatus` is
 * present on the first load, and reloads when the signed-in user changes.
 */
export function useElections(phase?: ElectionListPhase, org?: string): AsyncState<ElectionSummary[]> {
  const { user, loading: authLoading } = useAuth();
  const state = useAsync((signal) => listElections({ phase, org }, signal), [phase, org, user?.id], {
    enabled: !authLoading,
  });
  return { ...state, loading: state.loading || authLoading };
}
