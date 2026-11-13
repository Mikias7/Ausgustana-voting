import { useId, useState } from "react";
import { CircleCheck } from "lucide-react";
import type { RosterIssue } from "@asa/shared";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { GroupedList } from "../ui/GroupedList";
import { ListRow } from "../ui/ListRow";
import { SegmentedControl } from "../ui/SegmentedControl";
import { StatusIndicator } from "../ui/StatusIndicator";
import { TabPanel } from "../ui/TabPanel";
import { filterIssues, type IssueFilter } from "../../utils/roster";

/** Rows rendered before "Show all" (large files can produce thousands of issues). */
const INITIAL_LIMIT = 100;

const EMPTY_COPY: Record<IssueFilter, { title: string; description: string }> = {
  all: { title: "No issues found", description: "Every row in this file is valid." },
  errors: { title: "No errors", description: "No rows were skipped." },
  warnings: { title: "No warnings", description: "Nothing else to review in this file." },
};

interface ImportIssueListProps {
  issues: RosterIssue[];
}

/** Issues from a roster file, filterable by severity. Each row: message, line + username, severity dot + label. */
export function ImportIssueList({ issues }: ImportIssueListProps) {
  const tabsId = useId();
  const [filter, setFilter] = useState<IssueFilter>("all");
  const [showAll, setShowAll] = useState(false);
  const errors = issues.filter((i) => i.severity === "ERROR").length;
  const visible = filterIssues(issues, filter);
  const shown = showAll ? visible : visible.slice(0, INITIAL_LIMIT);

  return (
    <section aria-labelledby={`${tabsId}-heading`}>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 id={`${tabsId}-heading`} className="text-title-3">
          Issues
        </h3>
        <SegmentedControl
          id={tabsId}
          label="Filter issues"
          items={[
            { id: "all", label: "All", count: issues.length },
            { id: "errors", label: "Errors", count: errors },
            { id: "warnings", label: "Warnings", count: issues.length - errors },
          ]}
          value={filter}
          onChange={(next) => {
            setFilter(next);
            setShowAll(false);
          }}
          className="w-full sm:w-auto"
        />
      </div>
      <TabPanel tabsId={tabsId} value={filter}>
        {visible.length === 0 ? (
          <div className="rounded-row border border-hairline bg-surface">
            <EmptyState
              compact
              icon={<CircleCheck aria-hidden="true" />}
              title={EMPTY_COPY[filter].title}
              description={EMPTY_COPY[filter].description}
            />
          </div>
        ) : (
          <>
            <GroupedList label="Issues">
              {shown.map((issue, index) => (
                <ListRow
                  key={`${issue.line}-${index}`}
                  title={issue.message}
                  subtitle={
                    <span className="tabular">
                      Line {issue.line}
                      {issue.username && <> · {issue.username}</>}
                    </span>
                  }
                  trailing={
                    <StatusIndicator
                      tone={issue.severity === "ERROR" ? "danger" : "warning"}
                      label={issue.severity === "ERROR" ? "Error · row skipped" : "Warning"}
                    />
                  }
                />
              ))}
            </GroupedList>
            {visible.length > shown.length && (
              <div className="mt-3 flex items-center justify-between gap-3 px-4 text-footnote font-normal text-ink-2">
                <span className="tabular">
                  Showing {shown.length.toLocaleString()} of {visible.length.toLocaleString()}
                </span>
                <Button variant="ghost" size="sm" onClick={() => setShowAll(true)}>
                  Show all
                </Button>
              </div>
            )}
          </>
        )}
      </TabPanel>
    </section>
  );
}
