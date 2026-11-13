import {
  Building2,
  LayoutDashboard,
  ListChecks,
  Mail,
  Megaphone,
  ScrollText,
  Users,
  Vote,
  type LucideIcon,
} from "lucide-react";
import type { CurrentUser } from "@asa/shared";
import { isPlatformAdmin } from "../../utils/auth";

export interface AdminNavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Sidebar group (eyebrow label). */
  group: string;
  end?: boolean;
  /** Only platform admins see this section. */
  platformOnly?: boolean;
}

export const ADMIN_NAV: AdminNavItem[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, group: "Overview", end: true },
  { to: "/admin/elections", label: "Elections", icon: Vote, group: "Elections" },
  { to: "/admin/voter-lists", label: "Voter lists", icon: ListChecks, group: "Elections" },
  { to: "/admin/students", label: "Students & Import", icon: Users, group: "People", platformOnly: true },
  { to: "/admin/organizations", label: "Organizations & admins", icon: Building2, group: "People" },
  { to: "/admin/announcements", label: "Announcements", icon: Megaphone, group: "Communication" },
  { to: "/admin/messages", label: "Messages", icon: Mail, group: "Communication", platformOnly: true },
  { to: "/admin/audit-log", label: "Audit log", icon: ScrollText, group: "Records", platformOnly: true },
];

/** Admin sections visible to this user. */
export function adminNavFor(user: CurrentUser | null | undefined): AdminNavItem[] {
  const platformAdmin = isPlatformAdmin(user);
  return ADMIN_NAV.filter((item) => platformAdmin || !item.platformOnly);
}

/** Items grouped in display order. */
export function groupAdminNav(items: AdminNavItem[]): Array<{ group: string; items: AdminNavItem[] }> {
  const groups: Array<{ group: string; items: AdminNavItem[] }> = [];
  for (const item of items) {
    const existing = groups.find((g) => g.group === item.group);
    if (existing) existing.items.push(item);
    else groups.push({ group: item.group, items: [item] });
  }
  return groups;
}
