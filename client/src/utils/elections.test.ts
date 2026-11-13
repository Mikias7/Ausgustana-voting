import type { ElectionSummary, MyElectionStatus } from "@asa/shared";
import { describe, expect, it } from "vitest";
import { pickFeaturedElection } from "./elections";

function election(id: string, endsAt: string, slug = "club", myStatus?: Partial<MyElectionStatus>): ElectionSummary {
  return {
    id,
    title: id,
    description: null,
    organization: { id: slug, name: slug, slug },
    startsAt: "2026-11-01T00:00:00.000Z",
    endsAt,
    status: "PUBLISHED",
    phase: "open",
    resultsAvailable: false,
    myStatus: myStatus && { eligible: true, eligiblePositionIds: [], hasVoted: false, reason: null, ...myStatus },
  };
}

describe("pickFeaturedElection", () => {
  it("returns undefined for no elections", () => {
    expect(pickFeaturedElection(undefined)).toBeUndefined();
    expect(pickFeaturedElection([])).toBeUndefined();
  });

  it("prefers the soonest-closing election the viewer can still vote in", () => {
    const picked = pickFeaturedElection([
      election("club-ineligible", "2026-11-14T00:00:00.000Z", "club", { eligible: false }),
      election("asa-voted", "2026-11-15T00:00:00.000Z", "asa", { hasVoted: true }),
      election("later-eligible", "2026-11-20T00:00:00.000Z", "club", {}),
      election("sooner-eligible", "2026-11-18T00:00:00.000Z", "club", {}),
    ]);
    expect(picked?.id).toBe("sooner-eligible");
  });

  it("falls back to an ASA election when nothing is votable for the viewer", () => {
    const picked = pickFeaturedElection([
      election("club", "2026-11-14T00:00:00.000Z", "club", { eligible: false }),
      election("asa", "2026-11-18T00:00:00.000Z", "asa", { hasVoted: true }),
    ]);
    expect(picked?.id).toBe("asa");
  });

  it("falls back to an ASA election when signed out", () => {
    const picked = pickFeaturedElection([
      election("club", "2026-11-14T00:00:00.000Z"),
      election("asa", "2026-11-18T00:00:00.000Z", "asa"),
    ]);
    expect(picked?.id).toBe("asa");
  });

  it("otherwise picks the soonest-closing election", () => {
    const picked = pickFeaturedElection([
      election("later", "2026-11-20T00:00:00.000Z"),
      election("sooner", "2026-11-14T00:00:00.000Z"),
    ]);
    expect(picked?.id).toBe("sooner");
  });
});
