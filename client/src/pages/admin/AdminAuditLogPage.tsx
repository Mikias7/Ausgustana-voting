import { ScrollText } from "lucide-react";
import { AdminPlaceholder } from "./AdminPlaceholder";

export function AdminAuditLogPage() {
  return (
    <AdminPlaceholder
      title="Audit log"
      description="A record of administrative actions. It never includes ballot choices."
      icon={<ScrollText className="size-6" aria-hidden="true" />}
      planned="Browsing and filtering the audit log is coming in the next phase."
    />
  );
}
