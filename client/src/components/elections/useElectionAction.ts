import type { ReactNode } from "react";
import type { ElectionDetail } from "@asa/shared";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { loginPath } from "../../utils/auth";
import { formatDateTime } from "../../utils/dates";

export interface ElectionAction {
  title: string;
  body?: ReactNode;
  /** Primary call to action, if the visitor can do something now. */
  cta?: { to: string; label: string };
  /** The voter can vote right now — rendered as the navy brand panel. */
  prominent?: boolean;
}

/** What this visitor can do with the election right now (drives the action panel and mobile bar). */
export function useElectionAction(election: ElectionDetail): ElectionAction {
  const { user } = useAuth();
  const location = useLocation();
  const { phase, myStatus } = election;

  if (phase === "cancelled") {
    return { title: "This election was cancelled" };
  }
  if (phase === "upcoming" || phase === "draft") {
    return {
      title: `Opens ${formatDateTime(election.startsAt)}`,
      body: myStatus
        ? myStatus.eligible
          ? "You're eligible. Come back when voting opens."
          : (myStatus.reason ?? "You aren't eligible to vote in this election.")
        : "Sign in when voting opens to cast your ballot.",
    };
  }
  if (phase === "closed") {
    return election.resultsAvailable
      ? {
          title: "Voting has closed",
          body: "Results for this election are available.",
          cta: { to: `/elections/${election.id}/results`, label: "View results" },
        }
      : { title: "Voting has closed", body: "Results haven't been released yet." };
  }

  // phase === "open"
  if (!user || !myStatus) {
    return {
      title: "Voting is open",
      body: "Sign in with your Augustana account to check your eligibility and vote.",
      cta: { to: loginPath(location.pathname), label: "Sign in to vote" },
    };
  }
  if (myStatus.hasVoted) {
    return { title: "You've already voted", body: "Your ballot has been recorded. Thank you for participating!" };
  }
  if (!myStatus.eligible) {
    return { title: "You're not eligible for this election", body: myStatus.reason ?? undefined };
  }
  return {
    title: "Your ballot is ready",
    body: `Voting closes ${formatDateTime(election.endsAt)}.`,
    cta: { to: `/elections/${election.id}/vote`, label: "Vote now" },
    prominent: true,
  };
}
