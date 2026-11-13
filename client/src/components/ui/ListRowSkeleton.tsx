import { Skeleton } from "./Skeleton";

interface ListRowSkeletonProps {
  /** Show a circular leading placeholder (avatar rows). */
  leading?: boolean;
}

/** Placeholder row for a GroupedList while it loads. */
export function ListRowSkeleton({ leading = false }: ListRowSkeletonProps) {
  return (
    <li className="flex items-center gap-3.5 px-4 py-4" aria-hidden="true">
      {leading && <Skeleton className="size-10 shrink-0 rounded-full" />}
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-3 w-1/3" />
      </div>
      <Skeleton className="hidden h-3 w-16 sm:block" />
    </li>
  );
}
