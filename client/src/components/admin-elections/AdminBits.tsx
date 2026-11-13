import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

/** "‹ Elections" style back link for admin page headers. */
export function BackLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="-ml-2 inline-flex min-h-11 items-center gap-0.5 rounded-full pr-3 pl-1 text-callout font-medium text-navy-900 transition-colors duration-160 hover:text-navy-600"
    >
      <ChevronLeft className="size-[18px]" aria-hidden="true" /> {label}
    </Link>
  );
}

/** Title 3 heading + callout description at the top of a form Panel. */
export function PanelTitle({ id, title, description }: { id: string; title: string; description?: string }) {
  return (
    <div className="mb-5">
      <h2 id={id} className="text-title-3">
        {title}
      </h2>
      {description && <p className="mt-1 text-callout text-ink-2">{description}</p>}
    </div>
  );
}
