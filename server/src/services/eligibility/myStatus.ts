import type { MyElectionStatus } from "@asa/shared";
import { describeRule, isEligible, parseStoredRule, type EligibilityContext, type VoterFacts } from "./isEligible";

export interface ElectionForStatus {
  eligibility: unknown;
  positions: { id: string; eligibility: unknown }[];
}

const NOT_ON_ROSTER = "You are not on the current student roster";
const MISCONFIGURED = "Eligibility for this election is not configured correctly";

/**
 * Pure computation of a voter's status for one election: the voter must
 * satisfy the election rule AND each position's rule.
 */
export function computeMyStatus(
  election: ElectionForStatus,
  voter: VoterFacts,
  ctx: EligibilityContext,
  hasVoted: boolean,
): MyElectionStatus {
  const ineligible = (reason: string): MyElectionStatus => ({
    eligible: false,
    eligiblePositionIds: [],
    hasVoted,
    reason,
  });

  if (!voter.onRoster) return ineligible(NOT_ON_ROSTER);

  const electionRule = parseStoredRule(election.eligibility);
  if (!electionRule) return ineligible(MISCONFIGURED);
  if (!isEligible(voter, electionRule, ctx)) return ineligible(describeRule(electionRule));

  const positions = election.positions.map((p) => ({ id: p.id, rule: parseStoredRule(p.eligibility) }));
  const eligiblePositionIds = positions
    .filter((p) => p.rule !== null && isEligible(voter, p.rule, ctx))
    .map((p) => p.id);

  if (eligiblePositionIds.length === 0) {
    const only = positions.length === 1 ? positions[0]!.rule : null;
    return ineligible(only ? describeRule(only) : "You are not eligible for any position in this election");
  }

  return { eligible: true, eligiblePositionIds, hasVoted, reason: null };
}
