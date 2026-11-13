import type { ElectionDetail } from "@asa/shared";
import { getElection } from "../api/elections";
import { useAuth } from "../context/AuthContext";
import { useAsync, type AsyncState } from "./useAsync";

export function useElection(id: string | undefined): AsyncState<ElectionDetail> {
  const { user, loading: authLoading } = useAuth();
  const state = useAsync((signal) => getElection(id ?? "", signal), [id, user?.id], {
    enabled: Boolean(id) && !authLoading,
  });
  return { ...state, loading: state.loading || (Boolean(id) && authLoading) };
}
