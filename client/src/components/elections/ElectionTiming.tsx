import type { ElectionSummary } from "@asa/shared";
import { CalendarDays } from "lucide-react";
import { formatShortDateTime, toIso } from "../../utils/dates";
import { cn } from "../../utils/cn";

type TimingInput = Pick<ElectionSummary, "phase" | "startsAt" | "endsAt">;

/** One-line timing summary: "Closes Nov 20, 5:00 PM", "Opens …", "Closed …". */
export function ElectionTiming({ election, className }: { election: TimingInput; className?: string }) {
  const { phase, startsAt, endsAt } = election;
  let prefix: string;
  let date: string;
  switch (phase) {
    case "upcoming":
    case "draft":
      prefix = "Opens";
      date = startsAt;
      break;
    case "open":
      prefix = "Closes";
      date = endsAt;
      break;
    case "cancelled":
      prefix = "Was scheduled for";
      date = startsAt;
      break;
    default:
      prefix = "Closed";
      date = endsAt;
  }
  return (
    <p className={cn("flex items-center gap-1.5 text-sm text-slate-600", className)}>
      <CalendarDays className="size-4 shrink-0 text-slate-400" aria-hidden="true" />
      <span>
        {prefix} <time dateTime={toIso(date)}>{formatShortDateTime(date)}</time>
      </span>
    </p>
  );
}
