import { ChartColumn } from "lucide-react";
import { ElectionSubpage } from "./ElectionSubpage";

/** /elections/:id/results — totals and turnout. Built in feature/results. */
export function ResultsPage() {
  return (
    <ElectionSubpage
      title="Results"
      description="Vote totals for each position, winners, and turnout when the election publishes it."
      icon={<ChartColumn className="size-6" aria-hidden="true" />}
      comingSoon="Results pages are coming in the next phase."
    />
  );
}
