import { cn } from "../../utils/cn";
import { Spinner } from "./Spinner";

interface LoadingStateProps {
  label?: string;
  className?: string;
}

export function LoadingState({ label = "Loading…", className }: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("flex flex-1 flex-col items-center justify-center gap-3 py-20 text-ink-2", className)}
    >
      <Spinner className="size-6 text-navy-900" />
      <span className="text-footnote">{label}</span>
    </div>
  );
}
