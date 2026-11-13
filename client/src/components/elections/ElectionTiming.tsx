import type { ElectionSummary } from "@asa/shared";
import { formatMonthDay, formatShortDateTime, toIso } from "../../utils/dates";

type TimingInput = Pick<ElectionSummary, "phase" | "startsAt" | "endsAt">;

/** The key moment for an election's phase: "Closes …", "Opens …", "Closed …". */
export function timingFor({ phase, startsAt, endsAt }: TimingInput): { prefix: string; date: string } {
  switch (phase) {
    case "upcoming":
    case "draft":
      return { prefix: "Opens", date: startsAt };
    case "open":
      return { prefix: "Closes", date: endsAt };
    case "cancelled":
      return { prefix: "Was scheduled for", date: startsAt };
    default:
      return { prefix: "Closed", date: endsAt };
  }
}

interface ElectionTimingProps {
  election: TimingInput;
  /** "Closes Nov 20" (list rows) instead of "Closes Nov 20, 5:00 PM". */
  dateOnly?: boolean;
  className?: string;
}

/** Inline timing summary: "Closes Nov 20, 5:00 PM" (or date only). */
export function ElectionTiming({ election, dateOnly = false, className }: ElectionTimingProps) {
  const { prefix, date } = timingFor(election);
  return (
    <span className={className}>
      {prefix}{" "}
      <time dateTime={toIso(date)} className="tabular whitespace-nowrap">
        {dateOnly ? formatMonthDay(date) : formatShortDateTime(date)}
      </time>
    </span>
  );
}
