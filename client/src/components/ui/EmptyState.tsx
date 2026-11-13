import type { ReactNode } from "react";
import { Inbox } from "lucide-react";
import { cn } from "../../utils/cn";

interface EmptyStateProps {
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  /** Compact variant for use inside cards and sections. */
  compact?: boolean;
  className?: string;
}

export function EmptyState({ title, description, icon, action, compact = false, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-xl border border-dashed border-slate-300 bg-white/60 text-center",
        compact ? "px-6 py-8" : "px-6 py-14",
        className,
      )}
    >
      <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-augie-blue-50 text-augie-blue">
        {icon ?? <Inbox className="size-6" aria-hidden="true" />}
      </div>
      <p className="font-serif text-lg font-semibold text-slate-900">{title}</p>
      {description && <p className="mt-1.5 max-w-md text-sm text-slate-600">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
