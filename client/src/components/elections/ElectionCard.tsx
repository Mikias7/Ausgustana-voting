import type { ElectionSummary } from "@asa/shared";
import { ArrowRight, ChartColumn } from "lucide-react";
import { Link } from "react-router-dom";
import { Card } from "../ui/Card";
import { excerpt } from "../../utils/text";
import { EligibilityBadge } from "./EligibilityBadge";
import { ElectionTiming } from "./ElectionTiming";
import { PhaseBadge } from "./PhaseBadge";

interface ElectionCardProps {
  election: ElectionSummary;
  /** Heading level for the title, to keep the page outline correct. */
  headingLevel?: "h2" | "h3";
}

export function ElectionCard({ election, headingLevel: Heading = "h3" }: ElectionCardProps) {
  const showResults = election.phase === "closed" && election.resultsAvailable;
  return (
    <Card as="article" interactive padding="none" className="group relative flex h-full flex-col">
      <div className="h-1 rounded-t-xl bg-linear-to-r from-augie-blue via-augie-blue-600 to-augie-gold opacity-80" aria-hidden="true" />
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-semibold tracking-wider text-augie-gold-700 uppercase">
            {election.organization.name}
          </p>
          <PhaseBadge phase={election.phase} />
        </div>

        <Heading className="mt-3 text-xl leading-snug font-semibold">
          <Link
            to={`/elections/${election.id}`}
            className="rounded-sm text-slate-900 group-hover:text-augie-blue after:absolute after:inset-0 after:rounded-xl after:content-['']"
          >
            {election.title}
          </Link>
        </Heading>

        {election.description && (
          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-600">{excerpt(election.description, 180)}</p>
        )}

        <div className="mt-auto pt-5">
          <ElectionTiming election={election} />
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4">
            <div className="flex flex-wrap gap-2">
              <EligibilityBadge myStatus={election.myStatus} phase={election.phase} />
            </div>
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-augie-blue-700">
              {showResults ? (
                <>
                  <ChartColumn className="size-4" aria-hidden="true" /> Results
                </>
              ) : (
                <>
                  Details
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </>
              )}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
