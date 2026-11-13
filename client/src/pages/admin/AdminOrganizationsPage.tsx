import { Building2 } from "lucide-react";
import { AdminPlaceholder } from "./AdminPlaceholder";

export function AdminOrganizationsPage() {
  return (
    <AdminPlaceholder
      title="Organizations & admins"
      description="Student organizations that run elections, and the people who manage them."
      icon={<Building2 className="size-6" aria-hidden="true" />}
      planned="Managing organizations and assigning organization and election admins is coming in the next phase."
    />
  );
}
