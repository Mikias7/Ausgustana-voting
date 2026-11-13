import { useCallback, useEffect, useRef, useState, type DependencyList } from "react";

export interface AsyncState<T> {
  data: T | undefined;
  error: unknown;
  /** True while a request is in flight (including reloads; `data` keeps the last value). */
  loading: boolean;
  reload: () => void;
}

/**
 * Runs an async loader whenever `deps` change. Aborts the previous request and
 * ignores late results after unmount or when a newer request has started.
 * Pass `enabled: false` to skip loading (e.g. missing route param).
 */
export function useAsync<T>(
  loader: (signal: AbortSignal) => Promise<T>,
  deps: DependencyList,
  options: { enabled?: boolean } = {},
): AsyncState<T> {
  const enabled = options.enabled ?? true;
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<unknown>(undefined);
  const [loading, setLoading] = useState(enabled);
  const [nonce, setNonce] = useState(0);

  // Keep the latest loader without making it a dependency.
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    let active = true;
    setLoading(true);
    setError(undefined);

    loaderRef.current(controller.signal).then(
      (result) => {
        if (!active) return;
        setData(result);
        setLoading(false);
      },
      (err: unknown) => {
        if (!active) return;
        setData(undefined);
        setError(err);
        setLoading(false);
      },
    );

    return () => {
      active = false;
      controller.abort();
    };
  }, [...deps, nonce, enabled]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  return { data, error, loading, reload };
}
