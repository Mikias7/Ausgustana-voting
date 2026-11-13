import { useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { ChevronDown, ChevronLeft } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { Container } from "../ui/Container";
import { GroupedList } from "../ui/GroupedList";
import { ListRow } from "../ui/ListRow";
import { Modal } from "../ui/Modal";
import { AdminSidebar } from "./AdminSidebar";
import { adminNavFor, groupAdminNav } from "./adminNav";

/** Admin shell: macOS-Settings-style sidebar on ≥1024px; a section switcher sheet below that. */
export function AdminLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const items = adminNavFor(user);
  const current = items.find((item) =>
    item.end ? location.pathname === item.to : location.pathname.startsWith(item.to),
  );

  useEffect(() => setMenuOpen(false), [location.pathname]);

  return (
    <Container animate={false}>
      <div className="lg:grid lg:grid-cols-[248px_minmax(0,1fr)] lg:gap-12">
        <AdminSidebar items={items} />

        {/* Below 1024px: back link + current section button that opens a sheet. */}
        <div className="mb-8 flex items-center justify-between gap-3 lg:hidden">
          <Link
            to="/"
            className="-ml-2 inline-flex min-h-11 items-center gap-0.5 rounded-full pr-3 pl-1 text-callout font-medium text-navy-900"
          >
            <ChevronLeft className="size-[18px]" aria-hidden="true" /> Site
          </Link>
          <button
            type="button"
            aria-haspopup="dialog"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-inset pr-3.5 pl-4 text-callout font-medium text-ink transition-colors duration-160 hover:bg-navy-50"
          >
            <span className="sr-only">Admin section: </span>
            {current?.label ?? "Admin"}
            <ChevronDown className="size-4 text-ink-2" aria-hidden="true" />
          </button>
        </div>
        <Modal open={menuOpen} onClose={() => setMenuOpen(false)} placement="sheet" title="Administration">
          <nav aria-label="Admin" className="max-h-[70dvh] space-y-5 overflow-y-auto">
            {groupAdminNav(items).map(({ group, items: groupItems }) => (
              <GroupedList key={group} title={group}>
                {groupItems.map(({ to, label, icon: Icon }) => (
                  <ListRow
                    key={to}
                    to={to}
                    title={label}
                    leading={<Icon className="size-5" aria-hidden="true" />}
                    trailing={current?.to === to ? <span>Current</span> : undefined}
                  />
                ))}
              </GroupedList>
            ))}
          </nav>
        </Modal>

        <div key={location.pathname} className="min-w-0 animate-enter">
          <Outlet />
        </div>
      </div>
    </Container>
  );
}
