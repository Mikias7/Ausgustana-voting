import { useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useSignOut } from "../../hooks/useSignOut";
import { loginPath } from "../../utils/auth";
import { Button } from "../ui/Button";
import { UserMenu } from "./UserMenu";

/** "Sign in" pill when signed out, avatar menu when signed in (a placeholder while the session loads). */
export function AccountControl({ className }: { className?: string }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const signOut = useSignOut();

  if (loading) return <span className="size-11" aria-hidden="true" />;
  if (user) return <UserMenu user={user} onSignOut={signOut} />;

  const signInTo = location.pathname === "/login" ? "/login" : loginPath(location.pathname + location.search);
  return (
    <Button to={signInTo} size="sm" className={className}>
      Sign in
    </Button>
  );
}
