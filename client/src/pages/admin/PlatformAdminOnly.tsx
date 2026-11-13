import type { ReactNode } from "react";
import { ShieldAlert } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { useAuth } from "../../context/AuthContext";
import { isPlatformAdmin } from "../../utils/auth";

/** Admin sections that only platform administrators can use (the server enforces this too). */
export function PlatformAdminOnly({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (isPlatformAdmin(user)) return <>{children}</>;
  return (
    <EmptyState
      icon={<ShieldAlert aria-hidden="true" />}
      title="Platform administrators only"
      description="This section is managed by ASA platform administrators."
      action={
        <Button to="/admin" variant="secondary">
          Back to dashboard
        </Button>
      }
    />
  );
}
