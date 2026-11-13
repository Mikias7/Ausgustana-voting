import type { ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/Button";
import { Container } from "../components/ui/Container";
import { EmptyState } from "../components/ui/EmptyState";
import { LoadingState } from "../components/ui/LoadingState";
import { usePageTitle } from "../hooks/usePageTitle";
import { canAccessAdmin, loginPath } from "../utils/auth";

function NoAccess() {
  usePageTitle("Access denied");
  return (
    <Container size="sm" className="py-16">
      <EmptyState
        icon={<ShieldAlert className="size-6" aria-hidden="true" />}
        title="You don't have access to administration"
        description="Admin tools are available to ASA platform administrators and organization election admins. If you think this is a mistake, contact ASA."
        action={
          <Button to="/" variant="secondary">
            Back to home
          </Button>
        }
      />
    </Container>
  );
}

/**
 * Guards /admin. Signed-out users go to /login?next=…; signed-in users without
 * a platform-admin or organization role see a "no access" page.
 * The server enforces permissions on every admin endpoint regardless.
 */
export function AdminRoute({ children }: { children?: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingState label="Checking your session…" />;
  if (!user) return <Navigate to={loginPath(location.pathname + location.search)} replace />;
  if (!canAccessAdmin(user)) return <NoAccess />;
  return children ?? <Outlet />;
}
