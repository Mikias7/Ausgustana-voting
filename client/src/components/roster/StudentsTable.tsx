import { ChevronLeft, ChevronRight, Users } from "lucide-react";
import type { Paginated, StudentListItem } from "@asa/shared";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { ErrorState } from "../ui/ErrorState";
import { GroupedList } from "../ui/GroupedList";
import { ListRow } from "../ui/ListRow";
import { ListRowSkeleton } from "../ui/ListRowSkeleton";
import { Skeleton } from "../ui/Skeleton";
import { StatusIndicator } from "../ui/StatusIndicator";
import { cn } from "../../utils/cn";
import { classStandingLabel } from "../../utils/labels";
import { pageRangeLabel } from "../../utils/roster";

interface StudentsTableProps {
  data: Paginated<StudentListItem> | undefined;
  loading: boolean;
  error: unknown;
  onRetry: () => void;
  /** Filters are active: the empty state offers to clear them. */
  filtered: boolean;
  onClearFilters: () => void;
  onPageChange: (page: number) => void;
  skeletonRows?: number;
}

const name = (s: StudentListItem) => `${s.firstName} ${s.lastName}`.trim();

function RosterStatus({ onRoster }: { onRoster: boolean }) {
  return <StatusIndicator tone={onRoster ? "success" : "muted"} label={onRoster ? "On roster" : "Off roster"} />;
}

function ClassLabel({ value }: { value: StudentListItem["classStanding"] }) {
  return value ? <>{classStandingLabel(value)}</> : <span className="text-ink-2">No class</span>;
}

const th = "px-4 py-2.5 text-left text-footnote text-ink-2";
const td = "px-4 py-3 align-middle";

/** Desktop: a clean table. Mobile: grouped-list rows. Then "1–25 of 312" with Prev/Next. */
export function StudentsTable({
  data,
  loading,
  error,
  onRetry,
  filtered,
  onClearFilters,
  onPageChange,
  skeletonRows = 8,
}: StudentsTableProps) {
  const surface = "overflow-hidden rounded-row border border-hairline bg-surface";

  if (error && !data) {
    return (
      <div className={surface}>
        <ErrorState compact title="We couldn't load students" error={error} onRetry={onRetry} />
      </div>
    );
  }

  if (!data) {
    return (
      <div aria-busy="true">
        <span className="sr-only" role="status">
          Loading students…
        </span>
        <div className={cn(surface, "hidden md:block")} aria-hidden="true">
          {Array.from({ length: skeletonRows }, (_, i) => (
            <div key={i} className="flex items-center gap-6 border-t border-hairline px-4 py-4 first:border-t-0">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
        <ul className={cn(surface, "md:hidden")} aria-hidden="true">
          {Array.from({ length: Math.min(skeletonRows, 6) }, (_, i) => (
            <ListRowSkeleton key={i} />
          ))}
        </ul>
      </div>
    );
  }

  if (data.items.length === 0) {
    return (
      <div className={surface}>
        <EmptyState
          compact
          icon={<Users aria-hidden="true" />}
          title={filtered ? "No students match" : "No students yet"}
          description={
            filtered ? "Try a different search or filter." : "Import the university roster to add students."
          }
          action={
            filtered ? (
              <Button variant="secondary" size="sm" onClick={onClearFilters}>
                Clear filters
              </Button>
            ) : undefined
          }
        />
      </div>
    );
  }

  const { items, page, pageSize, total } = data;
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  const busy = loading;

  return (
    <div aria-busy={busy || undefined}>
      <div className={cn("transition-opacity duration-160", busy && "opacity-60")}>
        <div className={cn(surface, "hidden md:block")}>
          <table className="w-full table-fixed text-callout">
            <caption className="sr-only">Students</caption>
            <colgroup>
              <col className="w-[24%]" />
              <col className="w-[16%]" />
              <col />
              <col className="w-[13%]" />
              <col className="w-[14%]" />
            </colgroup>
            <thead className="bg-inset/60">
              <tr>
                <th scope="col" className={th}>
                  Name
                </th>
                <th scope="col" className={th}>
                  Username
                </th>
                <th scope="col" className={th}>
                  Email
                </th>
                <th scope="col" className={th}>
                  Class
                </th>
                <th scope="col" className={th}>
                  Roster
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <tr key={s.id} className="border-t border-hairline transition-colors duration-160 hover:bg-inset/50">
                  <th scope="row" className={cn(td, "truncate text-left font-medium text-ink")}>
                    {name(s)}
                  </th>
                  <td className={cn(td, "truncate text-ink-2")}>{s.username}</td>
                  <td className={cn(td, "truncate text-ink-2")} title={s.email}>
                    {s.email}
                  </td>
                  <td className={cn(td, "text-ink")}>
                    <ClassLabel value={s.classStanding} />
                  </td>
                  <td className={td}>
                    <RosterStatus onRoster={s.onRoster} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <GroupedList label="Students" className="md:hidden">
          {items.map((s) => (
            <ListRow
              key={s.id}
              title={name(s)}
              subtitle={
                <span className="block truncate">
                  {s.username} · {s.email}
                </span>
              }
              trailing={
                <>
                  <span className="text-ink">
                    <ClassLabel value={s.classStanding} />
                  </span>
                  <RosterStatus onRoster={s.onRoster} />
                </>
              }
            />
          ))}
        </GroupedList>
      </div>

      <nav aria-label="Students pages" className="mt-4 flex items-center justify-between gap-3 px-1">
        <p className="text-footnote font-normal text-ink-2 tabular" aria-live="polite">
          {pageRangeLabel(page, pageSize, total)}
        </p>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1 || busy}
            leftIcon={<ChevronLeft className="size-4" aria-hidden="true" />}
          >
            Prev
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= lastPage || busy}
            rightIcon={<ChevronRight className="size-4" aria-hidden="true" />}
          >
            Next
          </Button>
        </div>
      </nav>
    </div>
  );
}
