import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  Building2,
  ChevronDown,
  LayoutDashboard,
  ListChecks,
  Mail,
  Megaphone,
  ScrollText,
  ShieldCheck,
  Users,
  Vote,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { isPlatformAdmin } from "../../utils/auth";
import { cn } from "../../utils/cn";
import { Container } from "../ui/Container";

interface AdminNavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  /** Only platform admins see this section. */
  platformOnly?: boolean;
}

export const ADMIN_NAV: AdminNavItem[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/elections", label: "Elections", icon: Vote },
  { to: "/admin/students", label: "Students & Import", icon: Users, platformOnly: true },
  { to: "/admin/voter-lists", label: "Voter lists", icon: ListChecks },
  { to: "/admin/organizations", label: "Organizations & admins", icon: Building2 },
  { to: "/admin/announcements", label: "Announcements", icon: Megaphone },
  { to: "/admin/messages", label: "Messages", icon: Mail, platformOnly: true },
  { to: "/admin/audit-log", label: "Audit log", icon: ScrollText, platformOnly: true },
];

function linkClass({ isActive }: { isActive: boolean }) {
  return cn(
    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
    isActive
      ? "bg-augie-blue text-white shadow-sm"
      : "text-slate-700 hover:bg-augie-blue-50 hover:text-augie-blue-800",
  );
}

export function AdminLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const platformAdmin = isPlatformAdmin(user);
  const items = ADMIN_NAV.filter((item) => platformAdmin || !item.platformOnly);
  const current = items.find((item) =>
    item.end ? location.pathname === item.to : location.pathname.startsWith(item.to),
  );

  useEffect(() => setMenuOpen(false), [location.pathname]);

  return (
    <div className="flex-1 bg-slate-50">
      <Container className="py-6 lg:py-10">
        <div className="lg:grid lg:grid-cols-[15rem_1fr] lg:gap-10">
          <aside className="mb-6 lg:mb-0">
            <div className="mb-4 hidden items-center gap-2 px-3 lg:flex">
              <ShieldCheck className="size-5 text-augie-gold-700" aria-hidden="true" />
              <span className="text-xs font-semibold tracking-[0.14em] text-slate-500 uppercase">Administration</span>
            </div>

            {/* Mobile: collapsible section switcher */}
            <button
              type="button"
              className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-card lg:hidden"
              aria-expanded={menuOpen}
              aria-controls="admin-nav"
              onClick={() => setMenuOpen((o) => !o)}
            >
              <span className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-augie-gold-700" aria-hidden="true" />
                Admin · {current?.label ?? "Menu"}
              </span>
              <ChevronDown className={cn("size-4 transition-transform", menuOpen && "rotate-180")} aria-hidden="true" />
            </button>

            <nav
              id="admin-nav"
              aria-label="Admin"
              className={cn(
                "mt-2 rounded-xl border border-slate-200 bg-white p-2 shadow-card lg:sticky lg:top-24 lg:mt-0 lg:block",
                !menuOpen && "hidden",
              )}
            >
              <ul className="space-y-0.5">
                {items.map(({ to, label, icon: Icon, end }) => (
                  <li key={to}>
                    <NavLink to={to} end={end} className={linkClass}>
                      <Icon className="size-4 shrink-0" aria-hidden="true" />
                      {label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>

          <div className="min-w-0">
            <Outlet />
          </div>
        </div>
      </Container>
    </div>
  );
}
