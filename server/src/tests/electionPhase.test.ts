import { describe, expect, it } from "vitest";
import { getElectionPhase } from "@asa/shared";

const NOW = new Date("2026-11-13T12:00:00Z");
const hours = (h: number) => new Date(NOW.getTime() + h * 3_600_000);
const published = (startsAt: Date, endsAt: Date, closedAt: Date | null = null) => ({
  status: "PUBLISHED" as const,
  startsAt,
  endsAt,
  closedAt,
});

describe("getElectionPhase", () => {
  it("is draft or cancelled based on status alone", () => {
    expect(getElectionPhase({ status: "DRAFT", startsAt: hours(-5), endsAt: hours(5) }, NOW)).toBe("draft");
    expect(getElectionPhase({ status: "CANCELLED", startsAt: hours(-5), endsAt: hours(5) }, NOW)).toBe("cancelled");
  });

  it("is upcoming before the start", () => {
    expect(getElectionPhase(published(hours(1), hours(5)), NOW)).toBe("upcoming");
  });

  it("is open from the start (inclusive) until the end (exclusive)", () => {
    expect(getElectionPhase(published(NOW, hours(5)), NOW)).toBe("open");
    expect(getElectionPhase(published(hours(-1), hours(1)), NOW)).toBe("open");
    expect(getElectionPhase(published(hours(-5), NOW), NOW)).toBe("closed");
  });

  it("is closed after the end", () => {
    expect(getElectionPhase(published(hours(-5), hours(-1)), NOW)).toBe("closed");
  });

  it("is closed when closed early", () => {
    expect(getElectionPhase(published(hours(-5), hours(5), hours(-1)), NOW)).toBe("closed");
  });

  it("accepts ISO strings", () => {
    expect(
      getElectionPhase({ status: "PUBLISHED", startsAt: hours(-1).toISOString(), endsAt: hours(1).toISOString() }, NOW),
    ).toBe("open");
  });
});
