import type { ReactNode } from "react";
import { RefreshCw, TriangleAlert } from "lucide-react";
import { getErrorMessage } from "../../api/client";
import { cn } from "../../utils/cn";
import { Button } from "./Button";

interface ErrorStateProps {
  title?: ReactNode;
  /** The thrown error; its message is shown. */
  error?: unknown;
  message?: ReactNode;
  onRetry?: () => void;
  compact?: boolean;
  className?: string;
}

export function ErrorState({
  title = "We couldn't load this",
  error,
  message,
  onRetry,
  compact = false,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn("flex flex-col items-center text-center", compact ? "px-6 py-10" : "px-6 py-16 sm:py-20", className)}
    >
      <div className="mb-5 flex size-12 items-center justify-center rounded-full bg-danger/8 text-danger">
        <TriangleAlert className="size-6" strokeWidth={1.5} aria-hidden="true" />
      </div>
      <p className="text-title-3">{title}</p>
      <p className="mt-1.5 max-w-md text-callout text-ink-2">{message ?? getErrorMessage(error)}</p>
      {onRetry && (
        <Button
          variant="secondary"
          size="sm"
          className="mt-6"
          onClick={onRetry}
          leftIcon={<RefreshCw className="size-4" aria-hidden="true" />}
        >
          Try again
        </Button>
      )}
    </div>
  );
}
