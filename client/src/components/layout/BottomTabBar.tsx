import { useEffect, useState, type ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Ellipsis, House, LogIn, UserRound, Vote, type LucideIcon } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { loginPath } from "../../utils/auth";
import { cn } from "../../utils/cn";
import { MoreSheet } from "./MoreSheet";

const MORE_PATHS = ["/about", "/contact", "/admin"];

const itemClass =
  "flex h-full min-w-0 flex-1 flex-col items-center justify-center gap-px rounded-full text-caption transition-colors duration-160 focus-visible:outline-offset-[-2px]";

function TabContent({ icon: Icon, label, active }: { icon: LucideIcon; label: ReactNode; active: boolean }) {
  return (
    <>
      <span
        className={cn(
          "flex h-7 w-12 items-center justify-center rounded-full transition-colors duration-160 ease-apple",
          active && "bg-navy-100",
        )}
      >
        <Icon className="size-[20px]" strokeWidth={active ? 2.1 : 1.75} aria-hidden="true" />
      </span>
      <span className={active ? "font-semibold" : undefined}>{label}</span>
      <span aria-hidden="true" className={cn("size-1 rounded-full", active ? "bg-gold" : "bg-transparent")} />
    </>
  );
}

function Tab({ to, end, icon, label }: { to: string; end?: boolean; icon: LucideIcon; label: string }) {
  return (
    <li className="flex flex-1">
      <NavLink
        to={to}
        end={end}
        className={({ isActive }) => cn(itemClass, isActive ? "text-navy-900" : "text-ink-2")}
      >
        {({ isActive }) => <TabContent icon={icon} label={label} active={isActive} />}
      </NavLink>
    </li>
  );
}

/** Mobile (<768px): iOS-style floating glass tab bar, safe-area aware. */
export function BottomTabBar() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = MORE_PATHS.some((p) => location.pathname.startsWith(p));

  useEffect(() => setMoreOpen(false), [location.pathname]);

  const signInTo = location.pathname === "/login" ? "/login" : loginPath(location.pathname + location.search);

  return (
    <>
      <nav
        aria-label="Main"
        className="fixed inset-x-3 bottom-[var(--tabbar-bottom)] z-40 mx-auto max-w-md md:hidden"
      >
        <ul className="glass flex h-[var(--tabbar-height)] items-stretch rounded-full border border-hairline p-1 shadow-float">
          <Tab to="/" end icon={House} label="Home" />
          <Tab to="/elections" icon={Vote} label="Elections" />
          {user || loading ? (
            <Tab to="/profile" icon={UserRound} label="Profile" />
          ) : (
            <li className="flex flex-1">
              <NavLink
                to={signInTo}
                className={({ isActive }) => cn(itemClass, isActive ? "text-navy-900" : "text-ink-2")}
              >
                {({ isActive }) => <TabContent icon={LogIn} label="Sign in" active={isActive} />}
              </NavLink>
            </li>
          )}
          <li className="flex flex-1">
            <button
              type="button"
              aria-haspopup="dialog"
              aria-expanded={moreOpen}
              onClick={() => setMoreOpen(true)}
              className={cn(itemClass, moreActive ? "text-navy-900" : "text-ink-2")}
            >
              <TabContent icon={Ellipsis} label="More" active={moreActive} />
            </button>
          </li>
        </ul>
      </nav>
      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} />
    </>
  );
}
