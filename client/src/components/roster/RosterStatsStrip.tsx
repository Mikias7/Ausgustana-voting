import { CLASS_STANDINGS, type RosterStats } from "@asa/shared";
import { Skeleton } from "../ui/Skeleton";
import { formatDate } from "../../utils/dates";
import { classStandingPlural } from "../../utils/labels";

interface RosterStatsStripProps {
  stats: RosterStats | undefined;
  loading: boolean;
}

/**
 * Roster numbers under the page title, in the hero stats-strip style (navy Title-2 values,
 * footnote labels, hairline separators), with the class breakdown as a quieter second line.
 */
export function RosterStatsStrip({ stats, loading }: RosterStatsStripProps) {
  if (!stats) {
    if (!loading) return null;
    return (
      <div className="mb-12 space-y-5" aria-hidden="true">
        <div className="flex gap-8">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-6 w-14" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>
        <Skeleton className="h-3 w-72 max-w-full" />
      </div>
    );
  }

  const primary = [
    { label: "on roster", value: stats.onRoster.toLocaleString() },
    { label: "off roster", value: stats.offRoster.toLocaleString() },
    { label: "last import", value: stats.lastImportAt ? formatDate(stats.lastImportAt) : "Never" },
  ];
  const byClass = [
    ...CLASS_STANDINGS.map((c) => ({ label: classStandingPlural(c), value: stats.byClass[c] ?? 0 })),
    { label: "No class", value: stats.byClass.NONE ?? 0 },
  ];

  return (
    <div className="mb-12">
      <dl className="grid grid-cols-3 divide-x divide-hairline sm:flex sm:w-fit">
        {primary.map((item) => (
          <div key={item.label} className="flex flex-col-reverse justify-end px-4 first:pl-0 last:pr-0 sm:px-6">
            <dt className="mt-0.5 text-footnote font-normal text-ink-2">{item.label}</dt>
            <dd className="text-title-2 whitespace-nowrap text-navy-900 tabular">{item.value}</dd>
          </div>
        ))}
      </dl>
      <dl className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-footnote" aria-label="On roster by class">
        {byClass.map((item) => (
          <div key={item.label} className="flex flex-row-reverse items-baseline justify-end gap-1.5">
            <dt className="font-normal text-ink-2">{item.label}</dt>
            <dd className="text-ink tabular">{item.value.toLocaleString()}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
