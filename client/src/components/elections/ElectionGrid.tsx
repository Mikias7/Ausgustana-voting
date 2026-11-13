import type { ReactNode } from "react";
import type { ElectionSummary } from "@asa/shared";
import { Vote } from "lucide-react";
import { EmptyState } from "../ui/EmptyState";
import { ErrorState } from "../ui/ErrorState";
import { ElectionCard } from "./ElectionCard";
import { ElectionCardSkeleton } from "./ElectionCardSkeleton";

interface ElectionGridProps {
  elections: ElectionSummary[] | undefined;
  loading: boolean;
  error: unknown;
  onRetry: () => void;
  emptyTitle: string;
  emptyDescription?: ReactNode;
  emptyAction?: ReactNode;
  /** Show at most this many cards. */
  limit?: number;
  skeletonCount?: number;
  headingLevel?: "h2" | "h3";
  compact?: boolean;
}

/** Election cards with loading, error and empty states. */
export function ElectionGrid({
  elections,
  loading,
  error,
  onRetry,
  emptyTitle,
  emptyDescription,
  emptyAction,
  limit,
  skeletonCount = 3,
  headingLevel,
  compact,
}: ElectionGridProps) {
  if (loading && !elections) {
    return (
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <span className="sr-only" role="status">
          Loading elections…
        </span>
        {Array.from({ length: skeletonCount }, (_, i) => (
          <ElectionCardSkeleton key={i} />
        ))}
      </div>
    );
  }
  if (error) {
    return <ErrorState title="We couldn't load elections" error={error} onRetry={onRetry} compact={compact} />;
  }
  const items = limit ? (elections ?? []).slice(0, limit) : (elections ?? []);
  if (items.length === 0) {
    return (
      <EmptyState
        compact={compact}
        icon={<Vote className="size-6" aria-hidden="true" />}
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
      />
    );
  }
  return (
    <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-busy={loading || undefined}>
      {items.map((election) => (
        <li key={election.id}>
          <ElectionCard election={election} headingLevel={headingLevel} />
        </li>
      ))}
    </ul>
  );
}
