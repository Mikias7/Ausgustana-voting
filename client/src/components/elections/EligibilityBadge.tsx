import type { EligibilityRule, ElectionPhase, MyElectionStatus } from "@asa/shared";
import { Ban, CircleCheck, GraduationCap, Star } from "lucide-react";
import { Badge } from "../ui/Badge";
import { getEligibilityBadge } from "../../utils/elections";

interface EligibilityBadgeProps {
  myStatus: MyElectionStatus | undefined;
  phase: ElectionPhase;
  rule?: EligibilityRule;
  className?: string;
}

const iconClass = "size-3.5";

/** "Voted" / "Your class" / "Eligible" / "Not eligible" — or nothing when signed out. */
export function EligibilityBadge({ myStatus, phase, rule, className }: EligibilityBadgeProps) {
  const meta = getEligibilityBadge(myStatus, phase, rule);
  if (!meta) return null;
  const icon = {
    voted: <CircleCheck className={iconClass} aria-hidden="true" />,
    "your-class": <GraduationCap className={iconClass} aria-hidden="true" />,
    eligible: <Star className={iconClass} aria-hidden="true" />,
    "not-eligible": <Ban className={iconClass} aria-hidden="true" />,
  }[meta.kind];
  return (
    <Badge tone={meta.tone} icon={icon} className={className}>
      {meta.label}
    </Badge>
  );
}
