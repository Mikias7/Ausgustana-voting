import type { BallotChoice, BallotIssue, VotingMethod } from "@asa/shared";

export interface BallotPosition {
  id: string;
  title: string;
  votingMethod: VotingMethod;
  maxSelections: number;
  allowAbstain: boolean;
  allowWriteIn: boolean;
  candidateIds: string[];
}

/** One row to insert into ballot_selections. */
export type SelectionRow =
  | { positionId: string; candidateId: string; writeIn: null; abstain: false }
  | { positionId: string; candidateId: null; writeIn: string; abstain: false }
  | { positionId: string; candidateId: null; writeIn: null; abstain: true };

export type BallotValidation = { ok: true; rows: SelectionRow[] } | { ok: false; issues: BallotIssue[] };

/**
 * Pure check of a submitted ballot against the positions the voter may vote
 * for. The ballot must cover exactly `eligiblePositionIds`, each once.
 */
export function validateBallot(
  choices: BallotChoice[],
  positions: BallotPosition[],
  eligiblePositionIds: readonly string[],
): BallotValidation {
  const issues: BallotIssue[] = [];
  const rows: SelectionRow[] = [];
  const byId = new Map(positions.map((p) => [p.id, p]));
  const eligible = new Set(eligiblePositionIds);
  const seen = new Set<string>();

  for (const choice of choices) {
    const position = byId.get(choice.positionId);
    if (!position || !eligible.has(choice.positionId)) {
      issues.push({ positionId: choice.positionId, message: "You can't vote for this position" });
      continue;
    }
    if (seen.has(position.id)) {
      issues.push({ positionId: position.id, message: `${position.title} appears more than once` });
      continue;
    }
    seen.add(position.id);

    const problem = checkChoice(choice, position);
    if (problem) {
      issues.push({ positionId: position.id, message: problem });
      continue;
    }

    if (choice.abstain) {
      rows.push({ positionId: position.id, candidateId: null, writeIn: null, abstain: true });
      continue;
    }
    for (const candidateId of choice.candidateIds) {
      rows.push({ positionId: position.id, candidateId, writeIn: null, abstain: false });
    }
    if (choice.writeIn) rows.push({ positionId: position.id, candidateId: null, writeIn: choice.writeIn, abstain: false });
  }

  for (const id of eligiblePositionIds) {
    if (!seen.has(id) && !issues.some((i) => i.positionId === id)) {
      const title = byId.get(id)?.title ?? "A position";
      issues.push({ positionId: id, message: `${title} is missing from your ballot` });
    }
  }

  return issues.length ? { ok: false, issues } : { ok: true, rows };
}

function checkChoice(choice: BallotChoice, position: BallotPosition): string | null {
  const writeIn = choice.writeIn ?? null;

  if (choice.abstain) {
    if (!position.allowAbstain) return `Abstaining isn't allowed for ${position.title}`;
    if (choice.candidateIds.length || writeIn) return `You can't abstain and choose candidates for ${position.title}`;
    return null;
  }

  if (writeIn && !position.allowWriteIn) return `Write-ins aren't allowed for ${position.title}`;

  const valid = new Set(position.candidateIds);
  if (choice.candidateIds.some((id) => !valid.has(id))) return `Unknown candidate for ${position.title}`;
  if (new Set(choice.candidateIds).size !== choice.candidateIds.length) {
    return `A candidate was chosen twice for ${position.title}`;
  }

  const count = choice.candidateIds.length + (writeIn ? 1 : 0);
  const max = position.votingMethod === "SINGLE_CHOICE" ? 1 : position.maxSelections;
  if (count === 0) {
    return position.allowAbstain
      ? `Choose a candidate or abstain for ${position.title}`
      : `Choose a candidate for ${position.title}`;
  }
  if (count > max) return `Choose at most ${max} for ${position.title}`;
  return null;
}
