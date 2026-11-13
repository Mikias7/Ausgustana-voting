import { describe, expect, it } from "vitest";
import { timeUntil } from "./dates";

describe("timeUntil", () => {
  const now = new Date("2026-11-13T12:00:00.000Z");
  it.each([
    ["2026-11-15T13:00:00.000Z", "2 days"],
    ["2026-11-14T11:00:00.000Z", "23 hours"],
    ["2026-11-13T13:00:00.000Z", "1 hour"],
    ["2026-11-13T12:05:00.000Z", "5 minutes"],
    ["2026-11-13T12:00:30.000Z", "less than a minute"],
  ])("%s → %s", (date, expected) => {
    expect(timeUntil(date, now)).toBe(expected);
  });

  it("returns null once the date has passed", () => {
    expect(timeUntil("2026-11-13T11:59:00.000Z", now)).toBeNull();
  });
});
