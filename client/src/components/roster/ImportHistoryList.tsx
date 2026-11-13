import { useState } from "react";
import { History } from "lucide-react";
import type { ImportHistoryItem } from "@asa/shared";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { ErrorState } from "../ui/ErrorState";
import { GroupedList } from "../ui/GroupedList";
import { ListRow } from "../ui/ListRow";
import { ListRowSkeleton } from "../ui/ListRowSkeleton";
import { formatDate, toIso } from "../../utils/dates";
import { countsSummary, IMPORT_MODE_LABELS, plural } from "../../utils/roster";

const INITIAL_LIMIT = 5;

interface ImportHistoryListProps {
  items: ImportHistoryItem[] | undefined;
  loading: boolean;
  error: unknown;
  onRetry: () => void;
  onOpen: (id: string) => void;
}

/** Past imports, newest first. Each row opens the full summary. */
export function ImportHistoryList({ items, loading, error, onRetry, onOpen }: ImportHistoryListProps) {
  const [showAll, setShowAll] = useState(false);
  const surface = "rounded-row border border-hairline bg-surface";

  if (error && !items) {
    return (
      <div className={surface}>
        <ErrorState compact title="We couldn't load import history" error={error} onRetry={onRetry} />
      </div>
    );
  }
  if (!items) {
    return (
      <GroupedList label="Import history" aria-busy={loading}>
        {[0, 1, 2].map((i) => (
          <ListRowSkeleton key={i} />
        ))}
      </GroupedList>
    );
  }
  if (items.length === 0) {
    return (
      <div className={surface}>
        <EmptyState
          compact
          icon={<History aria-hidden="true" />}
          title="No imports yet"
          description="Every roster import is recorded here with its counts and issues."
        />
      </div>
    );
  }

  const shown = showAll ? items : items.slice(0, INITIAL_LIMIT);
  return (
    <>
      <GroupedList label="Import history">
        {shown.map((item) => (
          <ListRow
            key={item.id}
            onClick={() => onOpen(item.id)}
            title={item.fileName}
            srSuffix="— view summary"
            subtitle={
              <>
                <time dateTime={toIso(item.createdAt)}>{formatDate(item.createdAt)}</time>
                {" · "}
                {IMPORT_MODE_LABELS[item.mode]}
                {item.uploadedBy && <> · {item.uploadedBy}</>}
              </>
            }
            trailing={
              <>
                <span className="tabular">{countsSummary(item.counts)}</span>
                {item.issueCount > 0 && <span className="tabular text-ink">{plural(item.issueCount, "issue")}</span>}
              </>
            }
          />
        ))}
      </GroupedList>
      {items.length > INITIAL_LIMIT && (
        <div className="mt-3 flex justify-end px-1">
          <Button variant="ghost" size="sm" onClick={() => setShowAll((v) => !v)}>
            {showAll ? "Show fewer" : `Show all ${items.length}`}
          </Button>
        </div>
      )}
    </>
  );
}
