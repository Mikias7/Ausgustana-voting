import { Check } from "lucide-react";
import { cn } from "../../utils/cn";

const STEPS = ["Choose file", "Preview", "Done"] as const;

/** Three-step progress: completed steps get a check, the current one is navy. */
export function ImportStepper({ current }: { current: 0 | 1 | 2 }) {
  return (
    <ol className="flex items-center gap-2 sm:gap-3" aria-label="Import progress">
      {STEPS.map((label, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <li key={label} className="flex items-center gap-2 sm:gap-3" aria-current={active ? "step" : undefined}>
            {index > 0 && (
              <span
                aria-hidden="true"
                className={cn("h-px w-5 sm:w-10", done || active ? "bg-navy-300" : "bg-hairline-strong")}
              />
            )}
            <span
              aria-hidden="true"
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full text-footnote tabular transition-colors duration-240",
                active && "bg-navy-900 text-white",
                done && "bg-navy-100 text-navy-900",
                !active && !done && "bg-inset text-ink-2",
              )}
            >
              {done ? <Check className="size-4" strokeWidth={2.25} /> : index + 1}
            </span>
            <span className={cn("text-footnote", active ? "text-ink" : "text-ink-2 max-sm:sr-only")}>
              {label}
              {done && <span className="sr-only"> (completed)</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
