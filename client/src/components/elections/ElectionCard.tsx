import type { ElectionSummary } from "@asa/shared";
import { ChartColumn } from "lucide-react";
import { ListRow } from "../ui/ListRow";
import { StatusIndicator } from "../ui/StatusIndicator";
import { ElectionFeature } from "./ElectionFeature";
import { ElectionTiming } from "./ElectionTiming";
import { EligibilityChip } from "./EligibilityChip";

interface ElectionCardProps {
  election: ElectionSummary;
  /** "row" (default) is a GroupedList row; "feature" is the large home-page panel. */
  variant?: "row" | "feature";
  /** Heading level for the title, to keep the page outline correct. */
  headingLevel?: "h2" | "h3";
}

/** An election as a list row (title, org · timing, status, eligibility, chevron) or a feature panel. */
export function ElectionCard({ election, variant = "row", headingLevel = "h3" }: ElectionCardProps) {
  if (variant === "feature") return <ElectionFeature election={election} headingLevel={headingLevel} />;

  const showResults = election.phase === "closed" && election.resultsAvailable;
  return (
    <ListRow
      to={`/elections/${election.id}`}
      titleAs={headingLevel}
      prominent
      accent
      title={election.title}
      subtitle={
        <>
          {election.organization.name}
          <span aria-hidden="true"> · </span>
          <ElectionTiming election={election} dateOnly className="whitespace-nowrap" />
        </>
      }
      trailing={
        <>
          <EligibilityChip myStatus={election.myStatus} phase={election.phase} />
          {showResults && (
            <span className="inline-flex items-center gap-1.5 font-medium text-navy-900">
              <ChartColumn className="size-3.5" aria-hidden="true" /> Results
            </span>
          )}
          <StatusIndicator phase={election.phase} />
        </>
      }
    />
  );
}
