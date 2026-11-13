import { CircleAlert, CircleCheck } from "lucide-react";
import type { PublishIssue } from "@asa/shared";
import { cn } from "../../utils/cn";

interface PublishChecklistProps {
  issues: PublishIssue[];
  /** Position titles by id, to name the position an issue belongs to. */
  positionTitles?: Record<string, string>;
  /** Called when an issue that belongs to a position is clicked (e.g. jump to Positions). */
  onIssueClick?: (issue: PublishIssue) => void;
  heading?: string;
  className?: string;
}

/** Readiness checklist for a draft: the server's publishIssues, or a "ready" line when empty. */
export function PublishChecklist({
  issues,
  positionTitles = {},
  onIssueClick,
  heading = "Before you can publish",
  className,
}: PublishChecklistProps) {
  if (issues.length === 0) {
    return (
      <div className={cn("flex items-start gap-3", className)} role="status">
        <CircleCheck className="mt-0.5 size-5 shrink-0 text-success" aria-hidden="true" />
        <div>
          <p className="text-callout font-semibold text-ink">Ready to publish</p>
          <p className="text-footnote font-normal text-ink-2">
            Publishing shows the election to students. Voting opens automatically at the start time.
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className={className}>
      <p className="text-callout font-semibold text-ink" id="publish-checklist-heading">
        {heading}
      </p>
      <ul aria-labelledby="publish-checklist-heading" className="mt-2 space-y-1.5">
        {issues.map((issue, i) => {
          const title = issue.positionId ? positionTitles[issue.positionId] : undefined;
          // Server messages usually quote the position already; only prefix when they don't.
          const position = title && !issue.message.includes(title) ? title : undefined;
          const text = (
            <>
              {position && <span className="font-medium text-ink">{position}: </span>}
              {issue.message}
            </>
          );
          return (
            <li key={`${issue.code}-${issue.positionId ?? i}`} className="flex items-start gap-2.5 text-callout text-ink-2">
              <CircleAlert className="mt-[3px] size-4 shrink-0 text-warning" aria-hidden="true" />
              {onIssueClick && issue.positionId ? (
                <button
                  type="button"
                  className="text-left underline-offset-2 hover:text-ink hover:underline"
                  onClick={() => onIssueClick(issue)}
                >
                  {text}
                </button>
              ) : (
                <span>{text}</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
