import { Check } from "lucide-react";
import { WRITE_IN_MAX_LENGTH, type PositionDto } from "@asa/shared";
import { Avatar } from "../ui/Avatar";
import { cn } from "../../utils/cn";
import { votingMethodLabel } from "../../utils/labels";
import {
  canAddMore,
  choiceProblem,
  emptyChoice,
  maxChoices,
  setAbstain,
  setWriteIn,
  toggleCandidate,
  type DraftChoice,
} from "../../utils/ballot";

interface BallotPositionProps {
  position: PositionDto;
  choice: DraftChoice | undefined;
  onChange: (choice: DraftChoice) => void;
  /** Show the "what's missing" hint (after the voter tried to continue). */
  showProblem: boolean;
  /** Error from the server for this position, if any. */
  serverIssue?: string;
}

/**
 * One position on the ballot: a fieldset of selectable candidate cards (native radio or
 * checkbox inputs, so keyboard and screen readers work as expected), an optional write-in
 * and an optional abstain toggle.
 */
export function BallotPosition({ position, choice, onChange, showProblem, serverIssue }: BallotPositionProps) {
  const c = choice ?? emptyChoice;
  const single = maxChoices(position) === 1;
  const problem = serverIssue ?? (showProblem ? choiceProblem(position, c) : null);
  const name = `position-${position.id}`;
  const hintId = `${name}-hint`;
  const problemId = `${name}-problem`;
  const selected = c.candidateIds.length + (c.writeIn.trim() ? 1 : 0);

  return (
    <fieldset
      id={name}
      aria-describedby={cn(hintId, problem && problemId)}
      className={cn(
        "scroll-mt-28 rounded-panel border bg-surface p-5 sm:p-6",
        problem ? "border-danger/50" : "border-hairline",
      )}
    >
      <legend className="sr-only">{position.title}</legend>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-title-3">
          {position.title}
        </h2>
        {!single && !c.abstain && (
          <p className="text-footnote text-ink-2 tabular" aria-live="polite">
            {selected} of {maxChoices(position)} selected
          </p>
        )}
      </div>
      <p id={hintId} className="mt-1 text-footnote font-normal text-ink-2">
        {votingMethodLabel(position.votingMethod, position.maxSelections)}
        {position.seats > 1 && ` · ${position.seats} seats`}
      </p>
      {position.description && <p className="mt-2 text-callout text-ink-2">{position.description}</p>}

      <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
        {position.candidates.map((candidate) => {
          const checked = c.candidateIds.includes(candidate.id);
          const disabled = !checked && !canAddMore(position, c);
          return (
            <label
              key={candidate.id}
              className={cn(
                "group relative flex min-h-16 cursor-pointer items-center gap-3.5 rounded-row border p-3.5 transition-colors duration-160",
                checked ? "border-navy-900 bg-navy-50" : "border-hairline hover:bg-inset/70",
                disabled && "cursor-not-allowed opacity-50 hover:bg-transparent",
                "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-navy-900 has-[:focus-visible]:ring-offset-2",
              )}
            >
              <input
                type={single ? "radio" : "checkbox"}
                name={name}
                value={candidate.id}
                checked={checked}
                disabled={disabled}
                onChange={() => onChange(toggleCandidate(position, c, candidate.id))}
                // Radios can't be unchecked natively; clicking a checked one clears it.
                onClick={() => {
                  if (single && checked) onChange(toggleCandidate(position, c, candidate.id));
                }}
                className="sr-only"
              />
              <Avatar name={candidate.name} src={candidate.photoUrl} size="md" />
              <span className="min-w-0 flex-1">
                <span className="block text-body font-semibold">{candidate.name}</span>
                {candidate.bio && <span className="line-clamp-1 text-footnote font-normal text-ink-2">{candidate.bio}</span>}
              </span>
              <span
                aria-hidden="true"
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center border-2 transition-colors duration-160",
                  single ? "rounded-full" : "rounded-[7px]",
                  checked ? "border-navy-900 bg-navy-900 text-white" : "border-hairline-strong",
                )}
              >
                {checked && <Check className="size-3.5" strokeWidth={3} />}
              </span>
            </label>
          );
        })}
      </div>

      {(position.allowWriteIn || position.allowAbstain) && (
        <div className="mt-4 space-y-3 border-t border-hairline pt-4">
          {position.allowWriteIn && (
            <div>
              <label htmlFor={`${name}-writein`} className="text-footnote text-ink">
                Write in a name
              </label>
              <input
                id={`${name}-writein`}
                type="text"
                autoComplete="off"
                maxLength={WRITE_IN_MAX_LENGTH}
                value={c.writeIn}
                disabled={c.abstain || (!single && !c.writeIn && !canAddMore(position, c))}
                onChange={(e) => onChange(setWriteIn(position, c, e.target.value))}
                placeholder="Optional"
                className="mt-1.5 h-11 w-full rounded-input border border-hairline-strong bg-surface px-3.5 text-callout text-ink placeholder:text-ink-3 focus:border-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-900/15 disabled:bg-inset disabled:opacity-60"
              />
              <p className="mt-1 text-caption text-ink-2">Don&apos;t include anything that could identify you.</p>
            </div>
          )}
          {position.allowAbstain && (
            <label className="flex min-h-11 cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={c.abstain}
                onChange={(e) => onChange(setAbstain(c, e.target.checked))}
                className="size-[18px] cursor-pointer rounded-[5px] accent-navy-900"
              />
              <span className="text-callout font-medium text-ink">Abstain from this position</span>
            </label>
          )}
        </div>
      )}

      {problem && (
        <p id={problemId} role="alert" className="mt-4 text-footnote text-danger">
          {problem}
        </p>
      )}
    </fieldset>
  );
}
