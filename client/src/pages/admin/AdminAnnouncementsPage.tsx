import { Megaphone } from "lucide-react";
import { AdminPlaceholder } from "./AdminPlaceholder";

export function AdminAnnouncementsPage() {
  return (
    <AdminPlaceholder
      title="Announcements"
      description="News shown on the home page."
      icon={<Megaphone className="size-6" aria-hidden="true" />}
      planned="Writing, scheduling and publishing announcements is coming in the next phase."
    />
  );
}
