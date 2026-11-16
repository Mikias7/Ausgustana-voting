import type { CandidateResult, PositionResult, VotingMethod } from "@asa/shared";

export interface TallyPosition {
  id: string;
  title: string;
  seats: number;
  votingMethod: VotingMethod;
  candidates: { id: string; name: string }[];
}

/** Aggregates read from ballot_selections. Never individual ballots. */
export interface TallyInput {
  /** votes per candidate id */
  candidateVotes: Map<string, number>;
  /** abstentions per position id */
  abstentions: Map<string, number>;
  /** write-in texts with their counts, per position id */
  writeIns: Map<string, { text: string; votes: number }[]>;
  /** distinct ballots that included the position, per position id */
  ballots: Map<string, number>;
}

/** Groups write-ins that differ only in case or spacing ("ada  lovelace" = "Ada Lovelace"). */
function groupWriteIns(entries: { text: string; votes: number }[]): { name: string; votes: number }[] {
  const groups = new Map<string, { name: string; votes: number; best: number }>();
  for (const { text, votes } of entries) {
    const name = text.trim().replace(/\s+/g, " ");
    const key = name.toLowerCase();
    const group = groups.get(key);
    if (!group) groups.set(key, { name, votes, best: votes });
    else {
      group.votes += votes;
      // Show the spelling most voters used.
      if (votes > group.best) Object.assign(group, { name, best: votes });
    }
  }
  return [...groups.values()].map(({ name, votes }) => ({ name, votes }));
}

/**
 * Marks winners for `seats` seats. Candidates with zero votes never win. When
 * several candidates tie for the last seat(s) and they don't all fit, none of
 * them is declared a winner: they're marked TIED and the admin decides.
 */
export function decideOutcomes(sorted: CandidateResult[], seats: number): { candidates: CandidateResult[]; tie: boolean } {
  const withVotes = sorted.filter((c) => c.votes > 0);
  if (withVotes.length <= seats) {
    return { candidates: sorted.map((c) => ({ ...c, outcome: c.votes > 0 ? "WON" : null })), tie: false };
  }
  const cutoff = withVotes[seats - 1]!.votes;
  const above = withVotes.filter((c) => c.votes > cutoff).length;
  const atCutoff = withVotes.filter((c) => c.votes === cutoff).length;
  const tie = above + atCutoff > seats;
  return {
    candidates: sorted.map((c) => ({
      ...c,
      outcome: c.votes > cutoff ? "WON" : c.votes === cutoff ? (tie ? "TIED" : "WON") : null,
    })),
    tie,
  };
}

/** Pure: turns aggregate counts into per-position results, most votes first. */
export function tallyPositions(positions: TallyPosition[], input: TallyInput): PositionResult[] {
  return positions.map((p) => {
    const named: CandidateResult[] = p.candidates.map((c) => ({
      candidateId: c.id,
      name: c.name,
      writeIn: false,
      votes: input.candidateVotes.get(c.id) ?? 0,
      outcome: null,
    }));
    const writeIns: CandidateResult[] = groupWriteIns(input.writeIns.get(p.id) ?? []).map((w) => ({
      candidateId: null,
      name: w.name,
      writeIn: true,
      votes: w.votes,
      outcome: null,
    }));
    // Stable sort keeps ballot order among equal named candidates; write-ins come after them.
    const sorted = [...named, ...writeIns].sort((a, b) => b.votes - a.votes);
    const { candidates, tie } = decideOutcomes(sorted, Math.max(1, p.seats));

    return {
      positionId: p.id,
      title: p.title,
      seats: p.seats,
      votingMethod: p.votingMethod,
      totalBallots: input.ballots.get(p.id) ?? 0,
      abstentions: input.abstentions.get(p.id) ?? 0,
      candidates,
      tie,
    };
  });
}
