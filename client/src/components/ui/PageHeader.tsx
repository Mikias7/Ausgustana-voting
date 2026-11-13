import type { ReactNode } from "react";
import { cn } from "../../utils/cn";

interface PageHeaderProps {
  title: ReactNode;
  /** Small label above the title, e.g. the organization or section. */
  eyebrow?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  /** Content above the eyebrow, e.g. a back link. */
  breadcrumb?: ReactNode;
  className?: string;
}

export function PageHeader({ title, eyebrow, description, actions, breadcrumb, className }: PageHeaderProps) {
  return (
    <header className={cn("mb-8", className)}>
      {breadcrumb && <div className="mb-4">{breadcrumb}</div>}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {eyebrow && (
            <p className="mb-2 text-xs font-semibold tracking-[0.14em] text-augie-gold-700 uppercase">{eyebrow}</p>
          )}
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
          {description && <p className="mt-3 max-w-2xl text-base text-slate-600">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
