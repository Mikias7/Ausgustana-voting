import type { BallotSubmissionInput, PositionDto } from "@asa/shared";

/** The voter's in-progress choice for one position. Kept in memory only, never persisted. */
export interface DraftChoice {
  candidateIds: string[];
  writeIn: string;
  abstain: boolean;
}

export type BallotDraft = Record<string, DraftChoice>;

export const emptyChoice: DraftChoice = { candidateIds: [], writeIn: "", abstain: false };

export function maxChoices(position: Pick<PositionDto, "votingMethod" | "maxSelections">): number {
  return position.votingMethod === "SINGLE_CHOICE" ? 1 : position.maxSelections;
}

function selectedCount(choice: DraftChoice): number {
  return choice.candidateIds.length + (choice.writeIn.trim() ? 1 : 0);
}

/**
 * Selects or deselects a candidate. Single choice behaves like radio buttons
 * (picking another candidate replaces the pick, including a write-in);
 * multiple choice ignores picks past the limit.
 */
export function toggleCandidate(position: PositionDto, choice: DraftChoice, candidateId: string): DraftChoice {
  const selected = choice.candidateIds.includes(candidateId);
  if (selected) return { ...choice, candidateIds: choice.candidateIds.filter((id) => id !== candidateId) };

  if (maxChoices(position) === 1) return { candidateIds: [candidateId], writeIn: "", abstain: false };
  if (selectedCount(choice) >= maxChoices(position)) return choice;
  return { ...choice, candidateIds: [...choice.candidateIds, candidateId], abstain: false };
}

/** Updates the write-in. In single choice it replaces any candidate pick. */
export function setWriteIn(position: PositionDto, choice: DraftChoice, writeIn: string): DraftChoice {
  if (maxChoices(position) === 1) {
    return { candidateIds: writeIn.trim() ? [] : choice.candidateIds, writeIn, abstain: false };
  }
  return { ...choice, writeIn, abstain: false };
}

export function setAbstain(choice: DraftChoice, abstain: boolean): DraftChoice {
  return abstain ? { candidateIds: [], writeIn: "", abstain: true } : { ...choice, abstain: false };
}

/** True when the voter can pick another candidate (used to disable extra checkboxes). */
export function canAddMore(position: PositionDto, choice: DraftChoice): boolean {
  return maxChoices(position) === 1 || selectedCount(choice) < maxChoices(position);
}

/** Mirrors the server's checks so the voter sees problems before submitting. */
export function choiceProblem(position: PositionDto, choice: DraftChoice | undefined): string | null {
  const c = choice ?? emptyChoice;
  if (c.abstain) return position.allowAbstain ? null : "Abstaining isn't allowed for this position";
  const count = selectedCount(c);
  if (count === 0) return position.allowAbstain ? "Choose a candidate or abstain" : "Choose a candidate";
  if (count > maxChoices(position)) return `Choose at most ${maxChoices(position)}`;
  return null;
}

export function isComplete(position: PositionDto, choice: DraftChoice | undefined): boolean {
  return choiceProblem(position, choice) === null;
}

export function toSubmission(positions: PositionDto[], draft: BallotDraft): BallotSubmissionInput {
  return {
    choices: positions.map((p) => {
      const c = draft[p.id] ?? emptyChoice;
      if (c.abstain) return { positionId: p.id, candidateIds: [], abstain: true };
      const writeIn = c.writeIn.trim();
      return { positionId: p.id, candidateIds: c.candidateIds, ...(writeIn ? { writeIn } : {}), abstain: false };
    }),
  };
}

/** Human summary of a choice for the review step, e.g. ["Ann Lee", "Dana (write-in)"]. */
export function describeChoice(position: PositionDto, choice: DraftChoice | undefined): string[] {
  const c = choice ?? emptyChoice;
  if (c.abstain) return [];
  const names = c.candidateIds.map((id) => position.candidates.find((x) => x.id === id)?.name ?? "Unknown candidate");
  const writeIn = c.writeIn.trim();
  return writeIn ? [...names, `${writeIn} (write-in)`] : names;
}
