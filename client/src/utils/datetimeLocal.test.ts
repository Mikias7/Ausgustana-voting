import { afterEach, describe, expect, it } from "vitest";
import {
  defaultElectionWindow,
  formatOffset,
  isoToLocalInput,
  localInputToIso,
  parseLocalInput,
  timeZoneHint,
} from "./datetimeLocal";

describe("datetime-local helpers", () => {
  const originalTz = process.env.TZ;
  afterEach(() => {
    process.env.TZ = originalTz;
  });

  it("converts local input to ISO with the date's own offset (incl. DST)", () => {
    process.env.TZ = "America/Chicago";
    // November: CST (-06:00). July: CDT (-05:00).
    expect(localInputToIso("2026-11-20T17:00")).toBe("2026-11-20T17:00:00-06:00");
    expect(localInputToIso("2026-07-04T09:30")).toBe("2026-07-04T09:30:00-05:00");
  });

  it("converts ISO (any offset) back to local wall-clock input", () => {
    process.env.TZ = "America/Chicago";
    expect(isoToLocalInput("2026-11-20T23:00:00Z")).toBe("2026-11-20T17:00");
    expect(isoToLocalInput("2026-11-20T17:00:00-06:00")).toBe("2026-11-20T17:00");
    expect(isoToLocalInput("2026-07-04T14:30:00.000Z")).toBe("2026-07-04T09:30");
  });

  it("round-trips in any time zone", () => {
    for (const tz of ["UTC", "Asia/Kolkata", "America/Los_Angeles", "Australia/Adelaide"]) {
      process.env.TZ = tz;
      const iso = localInputToIso("2026-03-08T02:45");
      expect(iso).not.toBeNull();
      expect(new Date(iso!).getTime()).toBe(parseLocalInput("2026-03-08T02:45")!.getTime());
      expect(isoToLocalInput(localInputToIso("2026-12-31T23:59"))).toBe("2026-12-31T23:59");
    }
    process.env.TZ = "Asia/Kolkata";
    expect(formatOffset(new Date(2026, 0, 1))).toBe("+05:30");
  });

  it("rejects empty and invalid values", () => {
    expect(localInputToIso("")).toBeNull();
    expect(localInputToIso("2026-02-31T10:00")).toBeNull();
    expect(localInputToIso("not a date")).toBeNull();
    expect(isoToLocalInput(null)).toBe("");
    expect(isoToLocalInput("garbage")).toBe("");
  });

  it("produces a sensible default window and a time zone hint", () => {
    process.env.TZ = "America/Chicago";
    const { startsAt, endsAt } = defaultElectionWindow(new Date(2026, 10, 13, 15, 0));
    expect(startsAt).toBe("2026-11-14T09:00");
    expect(endsAt).toBe("2026-11-16T17:00");
    expect(timeZoneHint(new Date(2026, 10, 13))).toContain("America/Chicago");
  });
});
