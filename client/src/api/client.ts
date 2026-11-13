import type { ApiErrorBody } from "@asa/shared";

/** Base path for every API request. Vite proxies it to Express in development. */
export const API_BASE = "/api";

/** Error thrown for every failed API request (HTTP error or network failure). */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function isApiError(error: unknown, status?: number): error is ApiError {
  return error instanceof ApiError && (status === undefined || error.status === status);
}

/** A user-friendly message for any thrown value. */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return "Something went wrong. Please try again.";
}

type Primitive = string | number | boolean;
export type QueryParams = Record<string, Primitive | null | undefined>;
export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  query?: QueryParams;
  signal?: AbortSignal;
}

function buildUrl(path: string, query?: QueryParams): string {
  const url = `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

function isApiErrorBody(value: unknown): value is ApiErrorBody {
  if (typeof value !== "object" || value === null || !("error" in value)) return false;
  const err = (value as { error: unknown }).error;
  return typeof err === "object" && err !== null && "message" in err;
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function isAbortError(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { name?: string }).name === "AbortError";
}

/**
 * The single fetch wrapper used by every api/ module. Components never call fetch directly.
 * - Sends cookies (`credentials: "include"`).
 * - Adds `X-Requested-With: fetch` to every non-GET request (server CSRF guard).
 * - Throws `ApiError` for non-2xx responses and network failures.
 */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method ?? "GET";
  const headers: Record<string, string> = { Accept: "application/json" };
  if (method !== "GET") headers["X-Requested-With"] = "fetch";

  let body: BodyInit | undefined;
  if (options.body !== undefined) {
    if (options.body instanceof FormData) {
      body = options.body; // the browser sets the multipart boundary
    } else {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(options.body);
    }
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path, options.query), {
      method,
      headers,
      body,
      credentials: "include",
      signal: options.signal,
    });
  } catch (error) {
    if (isAbortError(error)) throw error;
    throw new ApiError(
      0,
      "NETWORK_ERROR",
      "We couldn't reach the server. Check your connection and try again.",
    );
  }

  const data = await readJson(response);

  if (!response.ok) {
    if (isApiErrorBody(data)) {
      const { code, message, details } = data.error;
      throw new ApiError(response.status, code || "HTTP_ERROR", message, details);
    }
    throw new ApiError(
      response.status,
      "HTTP_ERROR",
      response.statusText || `Request failed with status ${response.status}`,
    );
  }

  return data as T;
}

export const api = {
  get: <T>(path: string, query?: QueryParams, signal?: AbortSignal) =>
    request<T>(path, { query, signal }),
  post: <T>(path: string, body?: unknown, signal?: AbortSignal) =>
    request<T>(path, { method: "POST", body, signal }),
  put: <T>(path: string, body?: unknown, signal?: AbortSignal) =>
    request<T>(path, { method: "PUT", body, signal }),
  patch: <T>(path: string, body?: unknown, signal?: AbortSignal) =>
    request<T>(path, { method: "PATCH", body, signal }),
  delete: <T>(path: string, signal?: AbortSignal) =>
    request<T>(path, { method: "DELETE", signal }),
};
