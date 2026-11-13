import { LoaderCircle } from "lucide-react";
import { cn } from "../../utils/cn";

interface SpinnerProps {
  className?: string;
  /** Accessible label. Omit when the spinner is decorative (e.g. inside a labelled button). */
  label?: string;
}

export function Spinner({ className, label }: SpinnerProps) {
  return (
    <LoaderCircle
      className={cn("size-5 animate-spin", className)}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? "img" : undefined}
    />
  );
}
