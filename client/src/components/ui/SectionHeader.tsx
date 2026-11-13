import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "../../utils/cn";
import { BrandRule } from "./BrandRule";

interface SectionHeaderProps {
  id: string;
  title: ReactNode;
  description?: ReactNode;
  /** Trailing "See all ›" link; `srLabel` adds context for screen readers. */
  link?: { to: string; label: string; srLabel?: string };
  className?: string;
}

/** Title 2 section heading with an optional trailing link. */
export function SectionHeader({ id, title, description, link, className }: SectionHeaderProps) {
  return (
    <div className={cn("mb-4 flex items-center justify-between gap-4", className)}>
      <div className="min-w-0">
        <h2 id={id} className="flex items-center gap-3 text-title-2">
          <BrandRule size="sm" />
          {title}
        </h2>
        {description && <p className="mt-1 text-callout text-ink-2">{description}</p>}
      </div>
      {link && (
        <Link
          to={link.to}
          className="-mr-2 inline-flex min-h-11 shrink-0 items-center gap-0.5 rounded-full px-2 text-callout font-medium text-navy-900 transition-colors duration-160 hover:text-navy-600"
        >
          {link.label}
          {link.srLabel && <span className="sr-only"> {link.srLabel}</span>}
          <ChevronRight className="size-4" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}
