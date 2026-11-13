import { Vote } from "lucide-react";
import { AdminPlaceholder } from "./AdminPlaceholder";

export function AdminElectionsPage() {
  return (
    <AdminPlaceholder
      title="Elections"
      description="Create and manage elections for your organizations."
      icon={<Vote className="size-6" aria-hidden="true" />}
      planned="The election editor (details, positions & candidates, eligibility, results settings) and turnout stats are coming in the next phase."
    />
  );
}
