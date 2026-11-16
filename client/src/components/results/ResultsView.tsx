import { Check, Equal } from "lucide-react";
import type { CandidateResult, ElectionResults, PositionResult } from "@asa/shared";
import { cn } from "../../utils/cn";
import { percent, positionMeta, turnoutPercent, winners } from "../../utils/results";

function OutcomeChip({ outcome }: { outcome: CandidateResult["outcome"] }) {
  if (outcome === "WON") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-gold-soft px-2 py-0.5 text-footnote font-semibold text-gold-600">
        <Check className="size-3.5" aria-hidden="true" /> Elected
      </span>
    );
  }
  if (outcome === "TIED") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-inset px-2 py-0.5 text-footnote font-semibold text-warning">
        <Equal className="size-3.5" aria-hidden="true" /> Tied
      </span>
    );
  }
  return null;
}

function CandidateRow({ candidate, totalBallots }: { candidate: CandidateResult; totalBallots: number }) {
  const pct = percent(candidate.votes, totalBallots);
  const won = candidate.outcome === "WON";
  return (
    <li className="py-3.5 first:pt-0 last:pb-0">
      <div className="flex items-baseline justify-between gap-4">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <span className={cn("text-body text-ink", won && "font-semibold")}>{candidate.name}</span>
          {candidate.writeIn && <span className="text-footnote text-ink-2">Write-in</span>}
          <OutcomeChip outcome={candidate.outcome} />
        </div>
        <p className="shrink-0 text-callout text-ink tabular">
          <span className="font-semibold">{candidate.votes}</span>
          <span className="sr-only"> {candidate.votes === 1 ? "vote" : "votes"},</span>
          <span className="ml-2 text-ink-2">{pct}%</span>
        </p>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-inset" aria-hidden="true">
        <div
          className={cn("h-full rounded-full", won ? "bg-navy-900" : "bg-navy-300")}
          style={{ width: `${pct}%` }}
        />
      </div>
    </li>
  );
}

function PositionCard({ position }: { position: PositionResult }) {
  const headingId = `result-${position.positionId}`;
  const elected = winners(position);
  return (
    <section aria-labelledby={headingId} className="rounded-panel border border-hairline bg-surface p-5 sm:p-6">
      <header className="mb-5">
        <h2 id={headingId} className="text-title-3">
          {position.title}
        </h2>
        <p className="mt-1 text-footnote text-ink-2 tabular">{positionMeta(position)}</p>
        {elected.length > 0 && <p className="sr-only">Elected: {elected.join(", ")}.</p>}
      </header>

      {position.totalBallots === 0 ? (
        <p className="text-callout text-ink-2">Nobody voted for this position.</p>
      ) : position.candidates.length === 0 ? (
        <p className="text-callout text-ink-2">Every voter abstained.</p>
      ) : (
        <ol className="divide-y divide-hairline">
          {position.candidates.map((c) => (
            <CandidateRow key={c.candidateId ?? `w:${c.name}`} candidate={c} totalBallots={position.totalBallots} />
          ))}
        </ol>
      )}

      {position.tie && (
        <p className="mt-5 border-t border-hairline pt-4 text-footnote text-ink-2">
          Candidates marked <strong className="font-semibold text-ink">Tied</strong> have the same number of votes for
          the last {position.seats === 1 ? "seat" : "seats"}, so no winner is declared for them. The organizers will
          announce how the tie is resolved.
        </p>
      )}
    </section>
  );
}

function TurnoutSummary({ turnout }: { turnout: NonNullable<ElectionResults["turnout"]> }) {
  const items = [
    { label: "Turnout", value: `${turnoutPercent(turnout)}%` },
    { label: "Voted", value: turnout.voted.toLocaleString() },
    { label: "Eligible", value: turnout.eligible.toLocaleString() },
  ];
  return (
    <dl className="grid grid-cols-3 divide-x divide-hairline rounded-panel border border-hairline bg-surface py-5">
      {items.map((item) => (
        <div key={item.label} className="flex flex-col-reverse px-4 sm:px-6">
          <dt className="mt-0.5 text-footnote text-ink-2">{item.label}</dt>
          <dd className="text-title-2 text-navy-900 tabular">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Turnout and per-position totals. Shared by the public results page and the admin results tab. */
export function ResultsView({ results }: { results: ElectionResults }) {
  return (
    <div className="space-y-6">
      {results.turnout && <TurnoutSummary turnout={results.turnout} />}
      {results.positions.map((p) => (
        <PositionCard key={p.positionId} position={p} />
      ))}
      <p className="text-footnote text-ink-2">
        Percentages are the share of ballots for each position that chose that candidate
        {results.positions.some((p) => p.votingMethod === "MULTIPLE_CHOICE")
          ? "; where voters could pick more than one, they can add up to more than 100%"
          : ""}
        . Similar write-in names are grouped together.
      </p>
    </div>
  );
}
