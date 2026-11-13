import { Link, NavLink } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { cn } from "../../utils/cn";
import { groupAdminNav, type AdminNavItem } from "./adminNav";

function linkClass({ isActive }: { isActive: boolean }) {
  return cn(
    "flex min-h-9 items-center gap-3 rounded-control px-3 py-1.5 text-callout transition-colors duration-160 ease-apple",
    isActive ? "bg-navy-100 font-semibold text-navy-900" : "text-ink hover:bg-navy-900/5",
  );
}

/** ≥1024px sidebar in the style of macOS System Settings: grouped rows with eyebrow labels. */
export function AdminSidebar({ items }: { items: AdminNavItem[] }) {
  return (
    <aside className="hidden lg:block">
      <div className="sticky top-24 space-y-7">
        <Link
          to="/"
          className="-ml-1 inline-flex min-h-9 items-center gap-0.5 rounded-full pr-3 pl-0.5 text-callout font-medium text-navy-900 transition-colors duration-160 hover:text-navy-600"
        >
          <ChevronLeft className="size-[18px]" aria-hidden="true" /> Back to site
        </Link>
        <nav aria-label="Admin" className="space-y-6">
          {groupAdminNav(items).map(({ group, items: groupItems }) => (
            <div key={group}>
              <p id={`admin-group-${group}`} className="eyebrow mb-2 px-3">
                {group}
              </p>
              <ul aria-labelledby={`admin-group-${group}`} className="space-y-0.5">
                {groupItems.map(({ to, label, icon: Icon, end }) => (
                  <li key={to}>
                    <NavLink to={to} end={end} className={linkClass}>
                      {({ isActive }) => (
                        <>
                          <Icon
                            className={cn("size-[18px] shrink-0", isActive ? "text-navy-900" : "text-ink-2")}
                            aria-hidden="true"
                          />
                          {label}
                        </>
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>
    </aside>
  );
}
