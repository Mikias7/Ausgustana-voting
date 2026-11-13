import { Users } from "lucide-react";
import { AdminPlaceholder } from "./AdminPlaceholder";

export function AdminStudentsPage() {
  return (
    <AdminPlaceholder
      title="Students & Import"
      description="The student roster that decides who can vote."
      icon={<Users className="size-6" aria-hidden="true" />}
      planned="Roster upload with a dry-run preview, merge or full-sync import, and student search are coming in the next phase."
    />
  );
}
