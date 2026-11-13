import type { ReactNode } from "react";
import type { ElectionSummary } from "@asa/shared";
import { Vote } from "lucide-react";
import { EmptyState } from "../ui/EmptyState";
import { ErrorState } from "../ui/ErrorState";
import { GroupedList } from "../ui/GroupedList";
import { ListRowSkeleton } from "../ui/ListRowSkeleton";
import { ElectionCard } from "./ElectionCard";

interface ElectionListProps {
  elections: ElectionSummary[] | undefined;
  loading: boolean;
  error: unknown;
  onRetry: () => void;
  /** Accessible name for the list. */
  label: string;
  emptyTitle: string;
  emptyDescription?: ReactNode;
  emptyAction?: ReactNode;
  /** Show at most this many rows. */
  limit?: number;
  skeletonCount?: number;
  headingLevel?: "h2" | "h3";
  compact?: boolean;
}

/** Election rows in a grouped list, with skeleton, error and empty states. */
export function ElectionList({
  elections,
  loading,
  error,
  onRetry,
  label,
  emptyTitle,
  emptyDescription,
  emptyAction,
  limit,
  skeletonCount = 3,
  headingLevel,
  compact,
}: ElectionListProps) {
  if (loading && !elections) {
    return (
      <>
        <span className="sr-only" role="status">
          Loading elections…
        </span>
        <GroupedList label={label} aria-busy>
          {Array.from({ length: skeletonCount }, (_, i) => (
            <ListRowSkeleton key={i} />
          ))}
        </GroupedList>
      </>
    );
  }
  if (error) {
    return <ErrorState title="We couldn't load elections" error={error} onRetry={onRetry} compact={compact} />;
  }
  const items = limit ? (elections ?? []).slice(0, limit) : (elections ?? []);
  if (items.length === 0) {
    return (
      <div className="rounded-row border border-hairline bg-surface">
        <EmptyState
          compact={compact}
          icon={<Vote aria-hidden="true" />}
          title={emptyTitle}
          description={emptyDescription}
          action={emptyAction}
        />
      </div>
    );
  }
  return (
    <GroupedList label={label} aria-busy={loading}>
      {items.map((election) => (
        <ElectionCard key={election.id} election={election} headingLevel={headingLevel} />
      ))}
    </GroupedList>
  );
}
