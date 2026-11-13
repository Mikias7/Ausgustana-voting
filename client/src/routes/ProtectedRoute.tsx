import type { ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { LoadingState } from "../components/ui/LoadingState";
import { loginPath } from "../utils/auth";

/** Renders children/outlet only when signed in; otherwise redirects to /login?next=<current>. */
export function ProtectedRoute({ children }: { children?: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingState label="Checking your session…" />;
  if (!user) return <Navigate to={loginPath(location.pathname + location.search)} replace />;
  return children ?? <Outlet />;
}
