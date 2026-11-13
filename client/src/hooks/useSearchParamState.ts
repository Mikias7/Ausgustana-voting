import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

interface SearchParamStateOptions {
  /** Other params removed in the same update (e.g. `page` when a filter changes). */
  resetKeys?: readonly string[];
}

/**
 * A string value stored in the URL query (e.g. `?tab=past`), restricted to `allowed`.
 * Setting the default value removes the param to keep URLs clean. Uses `replace`
 * so switching tabs doesn't flood browser history.
 */
export function useSearchParamState<T extends string>(
  key: string,
  allowed: readonly T[],
  defaultValue: T,
  options: SearchParamStateOptions = {},
): [T, (value: T) => void] {
  const [params, setParams] = useSearchParams();
  const raw = params.get(key);
  const value = raw !== null && (allowed as readonly string[]).includes(raw) ? (raw as T) : defaultValue;
  const resetKeys = options.resetKeys?.join(",") ?? "";

  const setValue = useCallback(
    (next: T) => {
      setParams(
        (prev) => {
          const updated = new URLSearchParams(prev);
          if (next === defaultValue) updated.delete(key);
          else updated.set(key, next);
          if (resetKeys) for (const k of resetKeys.split(",")) updated.delete(k);
          return updated;
        },
        { replace: true, preventScrollReset: true },
      );
    },
    [key, defaultValue, setParams, resetKeys],
  );

  return [value, setValue];
}
