import type { ElectionPhase } from "@asa/shared";
import { Badge } from "../ui/Badge";
import { getPhaseMeta } from "../../utils/elections";

export function PhaseBadge({ phase, className }: { phase: ElectionPhase; className?: string }) {
  const { label, tone } = getPhaseMeta(phase);
  return (
    <Badge tone={tone} dot className={className}>
      {label}
    </Badge>
  );
}
