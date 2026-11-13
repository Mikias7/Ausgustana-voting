import { adminNavFor, groupAdminNav } from "../../components/layout/adminNav";
import { Alert } from "../../components/ui/Alert";
import { GroupedList } from "../../components/ui/GroupedList";
import { ListRow } from "../../components/ui/ListRow";
import { PageHeader } from "../../components/ui/PageHeader";
import { useAuth } from "../../context/AuthContext";
import { usePageTitle } from "../../hooks/usePageTitle";
import { useRosterStats } from "../../hooks/useRoster";
import { isPlatformAdmin } from "../../utils/auth";
import { orgRoleLabel, platformRoleLabel } from "../../utils/labels";

const DESCRIPTIONS: Record<string, string> = {
  "/admin/elections": "Create elections, positions and candidates; set eligibility and results options.",
  "/admin/students": "Import the university roster and manage student records.",
  "/admin/voter-lists": "Upload lists of usernames for voter-list eligibility.",
  "/admin/organizations": "Manage organizations and who can run their elections.",
  "/admin/announcements": "Post news to the home page.",
  "/admin/messages": "Read messages sent through the contact form.",
  "/admin/audit-log": "Review a record of administrative actions.",
};

export function AdminDashboardPage() {
  usePageTitle("Admin dashboard");
  const { user } = useAuth();
  const platformAdmin = isPlatformAdmin(user);
  const sections = adminNavFor(user).filter((s) => s.to !== "/admin");
  // Live roster count on the "Students & Import" row (one small request, platform admins only).
  const roster = useRosterStats({ enabled: platformAdmin });
  const trailing: Record<string, string | undefined> = {
    "/admin/students": roster.data ? `${roster.data.onRoster.toLocaleString()} on roster` : undefined,
  };

  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title={`Welcome, ${user?.firstName ?? "admin"}`}
        description={
          user
            ? platformAdmin
              ? platformRoleLabel(user.platformRole)
              : user.orgRoles.map((r) => `${orgRoleLabel(r.role)} · ${r.organizationSlug}`).join(" · ")
            : undefined
        }
      />
      <Alert tone="info" title="Admin tools are on the way" className="mb-10">
        The admin area is set up and protected. Each section below is being built in an upcoming phase.
      </Alert>
      <div className="space-y-8">
        {groupAdminNav(sections).map(({ group, items }) => (
          <GroupedList key={group} title={group}>
            {items.map(({ to, label, icon: Icon }) => (
              <ListRow
                key={to}
                to={to}
                title={label}
                subtitle={DESCRIPTIONS[to]}
                trailing={trailing[to] && <span className="tabular">{trailing[to]}</span>}
                leading={<Icon className="size-5" aria-hidden="true" />}
              />
            ))}
          </GroupedList>
        ))}
      </div>
    </>
  );
}
