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
      className={cn(
        "flex flex-col items-center rounded-xl border border-red-200 bg-red-50/60 text-center",
        compact ? "px-6 py-8" : "px-6 py-14",
        className,
      )}
    >
      <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-red-100 text-red-700">
        <TriangleAlert className="size-6" aria-hidden="true" />
      </div>
      <p className="font-serif text-lg font-semibold text-slate-900">{title}</p>
      <p className="mt-1.5 max-w-md text-sm text-slate-700">{message ?? getErrorMessage(error)}</p>
      {onRetry && (
        <Button
          variant="secondary"
          size="sm"
          className="mt-5"
          onClick={onRetry}
          leftIcon={<RefreshCw className="size-4" aria-hidden="true" />}
        >
          Try again
        </Button>
      )}
    </div>
  );
}
