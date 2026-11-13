import type { ReactNode } from "react";
import { cn } from "../../utils/cn";

interface PageHeaderProps {
  title: ReactNode;
  /** Small label above the title, e.g. the organization. */
  eyebrow?: ReactNode;
  description?: ReactNode;
  /** Controls aligned to the end of the header on wide screens. */
  actions?: ReactNode;
  /** Content above everything, e.g. a back link. */
  breadcrumb?: ReactNode;
  className?: string;
}

/** Large-title page header with optional eyebrow, description and actions. */
export function PageHeader({ title, eyebrow, description, actions, breadcrumb, className }: PageHeaderProps) {
  return (
    <header className={cn("mb-10 sm:mb-12", className)}>
      {breadcrumb && <div className="mb-5">{breadcrumb}</div>}
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
          <h1 className="text-large-title">{title}</h1>
          {description && <p className="mt-3 max-w-[680px] text-body text-ink-2">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-3">{actions}</div>}
      </div>
    </header>
  );
}
