import { ListChecks } from "lucide-react";
import { AdminPlaceholder } from "./AdminPlaceholder";

export function AdminVoterListsPage() {
  return (
    <AdminPlaceholder
      title="Voter lists"
      description="Named lists of students for voter-list eligibility (for example, international students)."
      icon={<ListChecks className="size-6" aria-hidden="true" />}
      planned="Creating and uploading voter lists is coming in the next phase."
    />
  );
}
