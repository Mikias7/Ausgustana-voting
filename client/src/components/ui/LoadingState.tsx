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
      className={cn("flex flex-col items-center justify-center gap-3 py-16 text-slate-600", className)}
    >
      <Spinner className="size-7 text-augie-blue" />
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}
