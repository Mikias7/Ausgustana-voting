import type { PositionDto } from "@asa/shared";
import { CircleCheck } from "lucide-react";
import { Badge } from "../ui/Badge";
import { describeEligibilityRule, votingMethodLabel } from "../../utils/labels";
import { CandidateCard } from "./CandidateCard";

interface PositionSectionProps {
  position: PositionDto;
  /** undefined when signed out; otherwise whether this voter may vote for the position. */
  canVote?: boolean;
}

export function PositionSection({ position, canVote }: PositionSectionProps) {
  const headingId = `position-${position.id}`;
  return (
    <section aria-labelledby={headingId} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 id={headingId} className="text-xl font-semibold">
            {position.title}
          </h3>
          {position.description && <p className="mt-1 text-sm text-slate-600">{position.description}</p>}
        </div>
        {canVote && (
          <Badge tone="gold" icon={<CircleCheck className="size-3.5" aria-hidden="true" />}>
            On your ballot
          </Badge>
        )}
      </div>

      <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
        <div className="flex gap-1.5">
          <dt className="font-medium text-slate-500">Format:</dt>
          <dd>{votingMethodLabel(position.votingMethod, position.maxSelections)}</dd>
        </div>
        <div className="flex gap-1.5">
          <dt className="font-medium text-slate-500">Seats:</dt>
          <dd>{position.seats}</dd>
        </div>
        <div className="flex gap-1.5">
          <dt className="font-medium text-slate-500">Who votes:</dt>
          <dd>{describeEligibilityRule(position.eligibility)}</dd>
        </div>
        {position.allowWriteIn && (
          <div className="flex gap-1.5">
            <dt className="sr-only">Write-ins:</dt>
            <dd>Write-ins allowed</dd>
          </div>
        )}
      </dl>

      {position.candidates.length > 0 ? (
        <ul className="mt-5 grid gap-4 md:grid-cols-2">
          {position.candidates.map((c) => (
            <li key={c.id}>
              <CandidateCard candidate={c} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-5 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Candidates for this position haven&apos;t been announced yet.
        </p>
      )}
    </section>
  );
}
