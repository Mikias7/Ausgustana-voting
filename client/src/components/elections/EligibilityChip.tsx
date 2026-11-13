import type { ElectionPhase, MyElectionStatus } from "@asa/shared";
import { CircleCheck } from "lucide-react";
import { cn } from "../../utils/cn";
import { getEligibility } from "../../utils/elections";

interface EligibilityChipProps {
  myStatus: MyElectionStatus | undefined;
  phase: ElectionPhase;
  /** Light treatment for navy surfaces. */
  onDark?: boolean;
  className?: string;
}

/** Quiet text chip: "You can vote" · "Voted" · "Not eligible" — or nothing when signed out. */
export function EligibilityChip({ myStatus, phase, onDark = false, className }: EligibilityChipProps) {
  const meta = getEligibility(myStatus, phase);
  if (!meta) return null;
  const base = "inline-flex items-center gap-1 text-footnote whitespace-nowrap";
  if (meta.kind === "eligible") {
    return (
      <span
        data-eligibility="eligible"
        className={cn(
          base,
          "gap-1.5 rounded-full py-0.5 pr-2.5 pl-2",
          onDark ? "bg-white/10 text-white" : "bg-navy-100 text-navy-900",
          className,
        )}
      >
        <span aria-hidden="true" className="size-1.5 rounded-full bg-gold ring-2 ring-gold/30" />
        {meta.label}
      </span>
    );
  }
  if (meta.kind === "voted") {
    return (
      <span data-eligibility="voted" className={cn(base, onDark ? "text-navy-100" : "text-success-text", className)}>
        <CircleCheck className={cn("size-3.5", onDark && "text-gold")} aria-hidden="true" />
        {meta.label}
      </span>
    );
  }
  return (
    <span data-eligibility="not-eligible" className={cn(base, onDark ? "text-navy-200" : "text-ink-2", className)}>
      {meta.label}
    </span>
  );
}
