import type { AnnouncementDto } from "@asa/shared";
import { api } from "./client";

export function listAnnouncements(signal?: AbortSignal): Promise<AnnouncementDto[]> {
  return api.get<AnnouncementDto[]>("/announcements", undefined, signal);
}
