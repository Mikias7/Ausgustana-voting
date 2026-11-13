import type { PositionDto } from "@asa/shared";
import { describeEligibilityRule, votingMethodLabel } from "../../utils/labels";
import { CandidateTile } from "./CandidateTile";

interface PositionSectionProps {
  position: PositionDto;
  /** undefined when signed out; otherwise whether this voter may vote for the position. */
  canVote?: boolean;
  /** h3 by default; h4 when nested under a group heading. */
  headingLevel?: "h3" | "h4";
}

/** A position: Title 3, "1 seat · Choose 1" meta, "On your ballot" gold-dot marker, candidate tiles. */
export function PositionSection({ position, canVote, headingLevel: Heading = "h3" }: PositionSectionProps) {
  const headingId = `position-${position.id}`;
  const seats = `${position.seats} seat${position.seats === 1 ? "" : "s"}`;
  return (
    <section aria-labelledby={headingId} className="border-t border-hairline py-8 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1.5">
        <Heading id={headingId} className="text-title-3">
          {position.title}
        </Heading>
        {canVote && (
          <p className="inline-flex items-center gap-2 text-footnote text-ink">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-gold ring-2 ring-gold/25" />
            On your ballot
          </p>
        )}
      </div>
      <p className="mt-1 text-footnote font-normal text-ink-2">
        {seats} · {votingMethodLabel(position.votingMethod, position.maxSelections)}
        {position.allowWriteIn && " · Write-ins allowed"}
        <span aria-hidden="true"> · </span>
        <span className="sr-only">. </span>
        {describeEligibilityRule(position.eligibility)}
      </p>
      {position.description && <p className="mt-3 max-w-[680px] text-callout text-ink-2">{position.description}</p>}

      {position.candidates.length > 0 ? (
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {position.candidates.map((c) => (
            <li key={c.id}>
              <CandidateTile candidate={c} headingLevel={Heading === "h3" ? "h4" : "h5"} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-5 rounded-row bg-inset px-4 py-3.5 text-callout text-ink-2">
          Candidates for this position haven&apos;t been announced yet.
        </p>
      )}
    </section>
  );
}
