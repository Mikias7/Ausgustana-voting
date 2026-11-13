import type { PositionDto } from "@asa/shared";
import { describeChoice, type BallotDraft } from "../../utils/ballot";

interface BallotReviewProps {
  positions: PositionDto[];
  draft: BallotDraft;
  onEdit: (positionId: string) => void;
}

/** Read-only summary of the ballot before submitting. */
export function BallotReview({ positions, draft, onEdit }: BallotReviewProps) {
  return (
    <div className="overflow-hidden rounded-panel border border-hairline bg-surface">
      <ul className="divide-y divide-hairline">
        {positions.map((p) => {
          const names = describeChoice(p, draft[p.id]);
          return (
            <li key={p.id} className="flex items-start justify-between gap-4 px-5 py-4 sm:px-6">
              <div className="min-w-0">
                <p className="text-footnote text-ink-2">{p.title}</p>
                {names.length ? (
                  <ul className="mt-1 space-y-0.5">
                    {names.map((n) => (
                      <li key={n} className="text-body font-semibold text-ink">
                        {n}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-body text-ink-2 italic">Abstained</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => onEdit(p.id)}
                className="-mr-2 inline-flex min-h-11 shrink-0 items-center rounded-full px-3 text-callout font-medium text-navy-900 hover:text-navy-600"
              >
                Change<span className="sr-only"> {p.title}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
