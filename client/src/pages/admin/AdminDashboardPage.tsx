import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { ADMIN_NAV } from "../../components/layout/AdminLayout";
import { Alert } from "../../components/ui/Alert";
import { Card } from "../../components/ui/Card";
import { PageHeader } from "../../components/ui/PageHeader";
import { useAuth } from "../../context/AuthContext";
import { usePageTitle } from "../../hooks/usePageTitle";
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
  const sections = ADMIN_NAV.filter((s) => s.to !== "/admin" && (platformAdmin || !s.platformOnly));

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
      <Alert tone="info" title="Admin tools are on the way" className="mb-8">
        The admin area is set up and protected. Each section below is being built in an upcoming phase.
      </Alert>
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {sections.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <Card interactive className="group relative h-full">
              <div className="mb-3 flex size-10 items-center justify-center rounded-lg bg-augie-blue-50 text-augie-blue">
                <Icon className="size-5" aria-hidden="true" />
              </div>
              <h2 className="font-sans text-base font-semibold">
                <Link to={to} className="after:absolute after:inset-0 after:content-['']">
                  {label}
                </Link>
              </h2>
              <p className="mt-1 text-sm text-slate-600">{DESCRIPTIONS[to]}</p>
              <ArrowRight
                className="absolute top-5 right-5 size-4 text-slate-300 transition-colors group-hover:text-augie-blue"
                aria-hidden="true"
              />
            </Card>
          </li>
        ))}
      </ul>
    </>
  );
}
