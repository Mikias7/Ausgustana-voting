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
