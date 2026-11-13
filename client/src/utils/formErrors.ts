import { isApiError } from "../api/client";

/** Field name → first error message. Keys are the first path segment ("title", "eligibility"). */
export type FieldErrors = Partial<Record<string, string>>;

interface IssueLike {
  path: ReadonlyArray<string | number> | string;
  message: string;
  code?: string;
}

/**
 * Collapses zod / API validation issues into one message per top-level field.
 * `friendly` replaces zod's generic wording ("String must contain at least 3 character(s)")
 * for a field; custom refinement messages (code "custom") are already friendly and kept.
 */
export function fieldErrorsFromIssues(
  issues: ReadonlyArray<IssueLike>,
  friendly: Partial<Record<string, string>> = {},
): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of issues) {
    const path = typeof issue.path === "string" ? issue.path.split(".") : issue.path;
    const key = String(path[0] ?? "_form");
    if (errors[key]) continue;
    errors[key] = issue.code === "custom" ? issue.message : (friendly[key] ?? issue.message);
  }
  return errors;
}

/** Field errors from a 400 VALIDATION_ERROR response (`details: [{ path, message }]`), else {}. */
export function fieldErrorsFromApiError(error: unknown): FieldErrors {
  if (!isApiError(error) || error.code !== "VALIDATION_ERROR" || !Array.isArray(error.details)) return {};
  const issues = (error.details as unknown[]).filter(
    (d): d is IssueLike =>
      typeof d === "object" && d !== null && "message" in d && "path" in d,
  );
  // Server paths may be prefixed with "body".
  return fieldErrorsFromIssues(
    issues.map((i) => {
      const path = typeof i.path === "string" ? i.path.split(".") : [...i.path];
      return { ...i, code: undefined, path: path[0] === "body" ? path.slice(1) : path };
    }),
  );
}

export const hasErrors = (errors: FieldErrors) => Object.values(errors).some(Boolean);
