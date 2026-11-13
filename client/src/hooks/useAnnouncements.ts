import { listAnnouncements } from "../api/announcements";
import { useAsync } from "./useAsync";

export function useAnnouncements() {
  return useAsync((signal) => listAnnouncements(signal), []);
}
