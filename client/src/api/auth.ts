import type { CurrentUser, DevUserOption } from "@asa/shared";
import { api, isApiError } from "./client";

/** Entry returned by GET /api/auth/dev/users (development sign-in only). */
export type DevUser = DevUserOption;

/** Returns the signed-in user, or null when signed out (401). */
export async function getCurrentUser(signal?: AbortSignal): Promise<CurrentUser | null> {
  try {
    return await api.get<CurrentUser>("/auth/me", undefined, signal);
  } catch (error) {
    if (isApiError(error, 401)) return null;
    throw error;
  }
}

export function logout(): Promise<void> {
  return api.post<void>("/auth/logout");
}

export function getDevUsers(signal?: AbortSignal): Promise<DevUser[]> {
  return api.get<DevUser[]>("/auth/dev/users", undefined, signal);
}

export function devLogin(username: string): Promise<CurrentUser> {
  return api.post<CurrentUser>("/auth/dev/login", { username });
}
