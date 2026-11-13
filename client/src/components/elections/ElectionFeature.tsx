import type { ElectionSummary } from "@asa/shared";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { BrandPanel } from "../ui/BrandPanel";
import { Button } from "../ui/Button";
import { StatusIndicator } from "../ui/StatusIndicator";
import { timeUntil } from "../../utils/dates";
import { excerpt } from "../../utils/text";
import { ElectionTiming, timingFor } from "./ElectionTiming";
import { EligibilityChip } from "./EligibilityChip";

interface ElectionFeatureProps {
  election: ElectionSummary;
  headingLevel?: "h2" | "h3";
}

/**
 * The home page's one strong brand moment: the featured open election on a navy surface,
 * with a countdown and a gold call to action ("Vote now" when the viewer can vote).
 */
export function ElectionFeature({ election, headingLevel: Heading = "h3" }: ElectionFeatureProps) {
  const { prefix, date } = timingFor(election);
  const remaining = timeUntil(date);
  const href = `/elections/${election.id}`;
  const canVote = election.phase === "open" && election.myStatus?.eligible && !election.myStatus.hasVoted;
  const cta = canVote
    ? { to: `${href}/vote`, label: "Vote now", aria: `Vote now in ${election.title}` }
    : { to: href, label: "View election", aria: `View ${election.title}` };

  return (
    <BrandPanel as="article" className="p-6 sm:p-8">
      <div className="flex items-center justify-between gap-4">
        <StatusIndicator phase={election.phase} onDark />
        <EligibilityChip myStatus={election.myStatus} phase={election.phase} onDark />
      </div>

      <p className="eyebrow mt-8">{election.organization.name}</p>
      <Heading className="mt-2.5 text-title-2 text-white">
        <Link to={href} className="rounded-[4px] text-white transition-colors duration-160 hover:text-navy-100">
          {election.title}
        </Link>
      </Heading>
      {election.description && (
        <p className="mt-2.5 text-callout text-navy-200">{excerpt(election.description, 140)}</p>
      )}

      <div className="mt-8 border-t border-white/10 pt-6">
        {remaining && (
          <>
            <p className="eyebrow">{prefix} in</p>
            <p className="mt-2 text-title-2 text-white tabular">{remaining}</p>
          </>
        )}
        <ElectionTiming election={election} className="mt-1 block text-footnote font-normal text-navy-200" />
        <Button
          to={cta.to}
          variant="gold"
          className="mt-6"
          fullWidth
          rightIcon={<ArrowRight className="size-4" aria-hidden="true" />}
          aria-label={cta.aria}
        >
          {cta.label}
        </Button>
      </div>
    </BrandPanel>
  );
}
