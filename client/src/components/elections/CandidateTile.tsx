import { useId, useState } from "react";
import type { CandidateDto } from "@asa/shared";
import { Avatar } from "../ui/Avatar";

/** Statements longer than this get a "More" toggle instead of being cut off silently. */
const CLAMP_THRESHOLD = 110;

/** Minimal candidate tile: 48px avatar, name, two-line statement (expandable). */
export function CandidateTile({
  candidate,
  headingLevel: Heading = "h4",
}: {
  candidate: CandidateDto;
  headingLevel?: "h4" | "h5";
}) {
  const [expanded, setExpanded] = useState(false);
  const bioId = useId();
  const long = (candidate.bio?.length ?? 0) > CLAMP_THRESHOLD;

  return (
    <article className="flex h-full gap-3.5 rounded-row bg-inset/60 p-4">
      <Avatar name={candidate.name} src={candidate.photoUrl} size="lg" />
      <div className="min-w-0 flex-1">
        <Heading className="text-body font-semibold">{candidate.name}</Heading>
        {candidate.bio ? (
          <>
            <p
              id={bioId}
              className={`mt-0.5 text-callout whitespace-pre-line text-ink-2 ${long && !expanded ? "line-clamp-2" : ""}`}
            >
              {candidate.bio}
            </p>
            {long && (
              <button
                type="button"
                aria-expanded={expanded}
                aria-controls={bioId}
                onClick={() => setExpanded((e) => !e)}
                className="-ml-1 mt-0.5 inline-flex min-h-8 items-center rounded-full px-1 text-footnote text-navy-900 hover:text-navy-600"
              >
                {expanded ? "Less" : "More"}
                <span className="sr-only"> about {candidate.name}</span>
              </button>
            )}
          </>
        ) : (
          <p className="mt-0.5 text-callout text-ink-2">No statement provided.</p>
        )}
      </div>
    </article>
  );
}
