import type { ProfileDto } from "@asa/shared";
import { api } from "./client";

export function getProfile(signal?: AbortSignal): Promise<ProfileDto> {
  return api.get<ProfileDto>("/me", undefined, signal);
}
