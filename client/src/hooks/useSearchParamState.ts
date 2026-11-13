import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

/**
 * A string value stored in the URL query (e.g. `?tab=past`), restricted to `allowed`.
 * Setting the default value removes the param to keep URLs clean. Uses `replace`
 * so switching tabs doesn't flood browser history.
 */
export function useSearchParamState<T extends string>(
  key: string,
  allowed: readonly T[],
  defaultValue: T,
): [T, (value: T) => void] {
  const [params, setParams] = useSearchParams();
  const raw = params.get(key);
  const value = raw !== null && (allowed as readonly string[]).includes(raw) ? (raw as T) : defaultValue;

  const setValue = useCallback(
    (next: T) => {
      setParams(
        (prev) => {
          const updated = new URLSearchParams(prev);
          if (next === defaultValue) updated.delete(key);
          else updated.set(key, next);
          return updated;
        },
        { replace: true, preventScrollReset: true },
      );
    },
    [key, defaultValue, setParams],
  );

  return [value, setValue];
}
