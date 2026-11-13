import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { CurrentUser } from "@asa/shared";
import * as authApi from "../api/auth";

export interface AuthContextValue {
  user: CurrentUser | null;
  /** True until the initial /api/auth/me check finishes. */
  loading: boolean;
  /** Error from the initial session check (e.g. server unreachable); user is treated as signed out. */
  error: unknown;
  login: (username: string) => Promise<CurrentUser>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(undefined);

  const refresh = useCallback(async () => {
    try {
      const current = await authApi.getCurrentUser();
      setUser(current);
      setError(undefined);
    } catch (err) {
      setUser(null);
      setError(err);
    }
  }, []);

  useEffect(() => {
    let active = true;
    authApi
      .getCurrentUser()
      .then(
        (current) => active && setUser(current),
        (err: unknown) => {
          if (!active) return;
          setUser(null);
          setError(err);
        },
      )
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (username: string) => {
    const current = await authApi.devLogin(username);
    setUser(current);
    setError(undefined);
    return current;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, error, login, logout, refresh }),
    [user, loading, error, login, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

/** For tests and stories: provide a fixed auth state. */
export function MockAuthProvider({ value, children }: { value: Partial<AuthContextValue>; children: ReactNode }) {
  const full: AuthContextValue = {
    user: null,
    loading: false,
    error: undefined,
    login: async () => {
      throw new Error("login not mocked");
    },
    logout: async () => {},
    refresh: async () => {},
    ...value,
  };
  return <AuthContext.Provider value={full}>{children}</AuthContext.Provider>;
}
