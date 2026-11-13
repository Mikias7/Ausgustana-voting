import type { ElectionSummary } from "@asa/shared";
import { Skeleton } from "../ui/Skeleton";
import { timeUntil } from "../../utils/dates";

interface ElectionStatsProps {
  openCount: number | undefined;
  upcomingCount: number | undefined;
  /** The featured open election, for the "closes in" figure. */
  featured: ElectionSummary | undefined;
  loading: boolean;
}

/** Quick stats under the hero: "2 open now · 1 coming up · 2 days until voting closes". Zero/unknown items are hidden. */
export function ElectionStats({ openCount, upcomingCount, featured, loading }: ElectionStatsProps) {
  if (loading) {
    return (
      <div className="mt-10 flex gap-8" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-6 w-12" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
    );
  }

  const closesIn = featured ? timeUntil(featured.endsAt) : null;
  const items = [
    openCount ? { value: String(openCount), label: "open now" } : null,
    upcomingCount ? { value: String(upcomingCount), label: "coming up" } : null,
    closesIn ? { value: closesIn, label: "until voting closes" } : null,
  ].filter((item): item is { value: string; label: string } => item !== null);

  if (items.length === 0) return null;

  return (
    <dl
      className="mt-10 grid divide-x divide-hairline sm:flex sm:w-fit"
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
    >
      {items.map((item) => (
        <div key={item.label} className="flex flex-col-reverse justify-end px-4 first:pl-0 last:pr-0 sm:px-6">
          <dt className="mt-0.5 text-footnote font-normal text-ink-2">{item.label}</dt>
          <dd className="text-title-2 text-navy-900 tabular">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
