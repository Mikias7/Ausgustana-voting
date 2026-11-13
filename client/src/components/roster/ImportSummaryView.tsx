import type { ImportCounts, ImportSummary } from "@asa/shared";
import { Alert } from "../ui/Alert";
import { formatDateTime } from "../../utils/dates";
import { IMPORT_MODE_LABELS, plural } from "../../utils/roster";
import { cn } from "../../utils/cn";
import { ImportIssueList } from "./ImportIssueList";

interface CountItem {
  key: keyof ImportCounts;
  label: string;
  hint: string;
}

function countItems(summary: ImportSummary): CountItem[] {
  const past = !summary.dryRun;
  const items: Array<CountItem | null> = [
    { key: "created", label: "New", hint: past ? "students added" : "students to add" },
    { key: "updated", label: "Updated", hint: past ? "records changed" : "records to change" },
    { key: "unchanged", label: "Unchanged", hint: "already up to date" },
    summary.mode === "FULL_SYNC"
      ? { key: "deactivated", label: "Off-roster", hint: past ? "were not in the file" : "missing from the file" }
      : null,
    { key: "skipped", label: "Skipped", hint: "rows with errors" },
    { key: "warnings", label: "Warnings", hint: "imported, worth a look" },
  ];
  return items.filter((i): i is CountItem => i !== null);
}

/** Count tiles: a hairline grid of navy figures with footnote labels. */
export function ImportCountsGrid({ summary }: { summary: ImportSummary }) {
  const items = countItems(summary);
  return (
    <dl
      className={cn(
        "grid grid-cols-2 gap-px overflow-hidden rounded-row border border-hairline bg-hairline sm:grid-cols-3",
        items.length === 6 ? "lg:grid-cols-6" : "lg:grid-cols-5",
      )}
    >
      {items.map((item) => (
        <div key={item.key} data-count={item.key} className="flex flex-col-reverse justify-end bg-surface px-4 py-3.5">
          <dt className="mt-1">
            <span className="block text-footnote text-ink">{item.label}</span>
            <span className="block text-footnote font-normal text-ink-2">{item.hint}</span>
          </dt>
          <dd className="text-title-2 text-navy-900 tabular">{summary.counts[item.key].toLocaleString()}</dd>
        </div>
      ))}
    </dl>
  );
}

interface ImportSummaryViewProps {
  summary: ImportSummary;
  /** Show the "election is open" alert (preview only; history reflects the past). */
  showOpenElectionWarning?: boolean;
  className?: string;
}

/** A dry-run preview, a finished import, or a history entry: meta line, counts, open-election alert, issues. */
export function ImportSummaryView({ summary, showOpenElectionWarning = true, className }: ImportSummaryViewProps) {
  const meta = [
    summary.fileName,
    IMPORT_MODE_LABELS[summary.mode],
    plural(summary.counts.valid, "valid row"),
    summary.createdAt ? formatDateTime(summary.createdAt) : null,
    summary.uploadedBy ? `by ${summary.uploadedBy}` : null,
  ].filter(Boolean);

  return (
    <div className={cn("space-y-6", className)}>
      <p className="text-footnote font-normal break-words text-ink-2">{meta.join(" · ")}</p>
      {showOpenElectionWarning && summary.openElectionWarning && (
        <Alert tone="warning" title="An election is open right now">
          Changes take effect immediately for eligibility.
        </Alert>
      )}
      <ImportCountsGrid summary={summary} />
      <ImportIssueList issues={summary.issues} />
    </div>
  );
}
