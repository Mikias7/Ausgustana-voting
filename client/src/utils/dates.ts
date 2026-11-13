/**
 * Date formatting with Intl. All API dates are ISO-8601 strings; they are shown
 * in the viewer's local time zone. Pass `timeZone` for deterministic output (tests).
 */
const LOCALE = "en-US";

type DateInput = string | Date;

function toDate(value: DateInput): Date {
  return value instanceof Date ? value : new Date(value);
}

export interface FormatOptions {
  timeZone?: string;
}

/** "Nov 20, 2026" */
export function formatDate(value: DateInput, opts: FormatOptions = {}): string {
  return new Intl.DateTimeFormat(LOCALE, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: opts.timeZone,
  }).format(toDate(value));
}

/** "Fri, Nov 20, 2026, 5:00 PM" */
export function formatDateTime(value: DateInput, opts: FormatOptions = {}): string {
  return new Intl.DateTimeFormat(LOCALE, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: opts.timeZone,
  }).format(toDate(value));
}

/** "Nov 20, 5:00 PM" — compact, for cards. */
export function formatShortDateTime(value: DateInput, opts: FormatOptions = {}): string {
  return new Intl.DateTimeFormat(LOCALE, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: opts.timeZone,
  }).format(toDate(value));
}

/** "Nov 16" — compact date for list rows. */
export function formatMonthDay(value: DateInput, opts: FormatOptions = {}): string {
  return new Intl.DateTimeFormat(LOCALE, { month: "short", day: "numeric", timeZone: opts.timeZone }).format(
    toDate(value),
  );
}

/** "Nov 18 – 20, 2026" style range. */
export function formatDateRange(start: DateInput, end: DateInput, opts: FormatOptions = {}): string {
  const fmt = new Intl.DateTimeFormat(LOCALE, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: opts.timeZone,
  });
  return fmt.formatRange(toDate(start), toDate(end));
}

/** Machine-readable value for <time dateTime>. */
export function toIso(value: DateInput): string {
  return toDate(value).toISOString();
}

/**
 * Coarse time until a date: "2 days", "5 hours", "12 minutes", "less than a minute".
 * Returns null when the date has passed. `now` is injectable for tests.
 */
export function timeUntil(value: DateInput, now: Date = new Date()): string | null {
  const ms = toDate(value).getTime() - now.getTime();
  if (ms <= 0) return null;
  const minutes = Math.floor(ms / 60_000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? "" : "s"}`;
  if (days >= 1) return plural(days, "day");
  if (hours >= 1) return plural(hours, "hour");
  if (minutes >= 1) return plural(minutes, "minute");
  return "less than a minute";
}
