import type { ReactNode } from "react";
import { Inbox } from "lucide-react";
import { cn } from "../../utils/cn";

interface EmptyStateProps {
  title: ReactNode;
  description?: ReactNode;
  /** Thin-stroke lucide icon; sized and stroked by this component. */
  icon?: ReactNode;
  /** Small label above the title, e.g. "Coming soon". */
  eyebrow?: ReactNode;
  action?: ReactNode;
  /** Less vertical space, for use inside sections. */
  compact?: boolean;
  className?: string;
}

/** Centered and quiet: icon in a navy-50 circle, title, one line of ink-2, optional action. */
export function EmptyState({ title, description, icon, eyebrow, action, compact = false, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center text-center",
        compact ? "px-6 py-10" : "px-6 py-16 sm:py-20",
        className,
      )}
    >
      <div className="mb-5 flex size-12 items-center justify-center rounded-full bg-navy-50 text-navy-900 [&_svg]:size-6 [&_svg]:stroke-[1.5]">
        {icon ?? <Inbox aria-hidden="true" />}
      </div>
      {eyebrow && <p className="eyebrow mb-2.5">{eyebrow}</p>}
      <p className="text-title-3">{title}</p>
      {description && <p className="mt-1.5 max-w-md text-callout text-ink-2">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
