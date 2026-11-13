/**
 * Conversions between <input type="datetime-local"> values ("2026-11-20T17:00", the
 * viewer's wall-clock time) and ISO-8601 strings with an explicit UTC offset
 * ("2026-11-20T17:00:00-06:00"), which the API requires.
 *
 * The offset is taken from that specific date, so daylight-saving changes between
 * now and the election are handled correctly.
 */

const pad = (n: number, width = 2) => String(Math.abs(n)).padStart(width, "0");

/** ISO string (any offset) → "YYYY-MM-DDTHH:mm" in the viewer's time zone. "" for empty/invalid input. */
export function isoToLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const LOCAL_INPUT = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

/** Local Date for a datetime-local value, or null when it is empty or malformed. */
export function parseLocalInput(value: string): Date | null {
  const m = LOCAL_INPUT.exec(value.trim());
  if (!m) return null;
  const [, y, mo, d, h, mi, s] = m.map(Number);
  const date = new Date(y, mo - 1, d, h, mi, s || 0, 0);
  // Reject overflow such as Feb 31 (the Date constructor would roll it over).
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null;
  return date;
}

/** "+HH:MM" / "-HH:MM" for a date in the viewer's time zone. */
export function formatOffset(date: Date): string {
  const minutes = -date.getTimezoneOffset();
  const sign = minutes >= 0 ? "+" : "-";
  return `${sign}${pad(Math.floor(Math.abs(minutes) / 60))}:${pad(Math.abs(minutes) % 60)}`;
}

/** Date → ISO string in local wall-clock time with offset, e.g. "2026-11-20T17:00:00-06:00". */
export function toOffsetIso(date: Date): string {
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}${formatOffset(date)}`
  );
}

/** datetime-local value → ISO string with offset, or null when empty/invalid. */
export function localInputToIso(value: string): string | null {
  const date = parseLocalInput(value);
  return date ? toOffsetIso(date) : null;
}

/** "Central Standard Time (America/Chicago)" — shown next to date fields. */
export function timeZoneHint(date: Date = new Date()): string {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const name = new Intl.DateTimeFormat("en-US", { timeZoneName: "long", timeZone: zone })
    .formatToParts(date)
    .find((p) => p.type === "timeZoneName")?.value;
  if (!zone) return name ?? "your local time";
  return name && name !== zone ? `${name} (${zone})` : zone;
}

/** Default schedule for a new election: tomorrow 9:00 AM → two days later 5:00 PM (local). */
export function defaultElectionWindow(now: Date = new Date()): { startsAt: string; endsAt: string } {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 9, 0);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3, 17, 0);
  return { startsAt: isoToLocalInput(start.toISOString()), endsAt: isoToLocalInput(end.toISOString()) };
}
