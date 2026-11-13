import { getProfile } from "../api/profile";
import { useAuth } from "../context/AuthContext";
import { useAsync } from "./useAsync";

export function useProfile() {
  const { user } = useAuth();
  return useAsync((signal) => getProfile(signal), [user?.id], { enabled: Boolean(user) });
}
