import type { ElectionPhase } from "@asa/shared";
import { cn } from "../../utils/cn";
import { getPhaseMeta, type StatusTone } from "../../utils/elections";

const dots: Record<StatusTone, string> = {
  success: "bg-success",
  upcoming: "bg-navy-400",
  muted: "bg-ink-3",
  danger: "bg-danger",
  warning: "bg-warning",
};

interface StatusIndicatorProps {
  /** Election phase; maps to label + dot color. */
  phase?: ElectionPhase;
  /** Or a custom tone + label (e.g. roster status). */
  tone?: StatusTone;
  label?: string;
  /** Light text for navy surfaces. */
  onDark?: boolean;
  className?: string;
}

/** A 6px dot plus a text label — status is never conveyed by color alone. Open pulses softly. */
export function StatusIndicator({ phase, tone, label, onDark = false, className }: StatusIndicatorProps) {
  const meta = phase ? getPhaseMeta(phase) : undefined;
  const finalTone = tone ?? meta?.tone ?? "muted";
  const finalLabel = label ?? meta?.label ?? "";
  return (
    <span
      data-status={finalTone}
      className={cn(
        "inline-flex items-center gap-2 text-footnote whitespace-nowrap",
        onDark ? "text-navy-100" : "text-ink-2",
        className,
      )}
    >
      <span aria-hidden="true" className="relative flex size-1.5">
        {phase === "open" && (
          <span className={cn("absolute inset-0 animate-pulse-ring rounded-full opacity-0", dots[finalTone])} />
        )}
        <span className={cn("relative size-1.5 rounded-full", dots[finalTone])} />
      </span>
      {finalLabel}
    </span>
  );
}
