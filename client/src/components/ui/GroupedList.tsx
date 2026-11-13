import { useId, type ReactNode } from "react";

interface GroupedListProps {
  /** Small header above the group (iOS inset-grouped style). Also labels the list. */
  title?: ReactNode;
  headingLevel?: "h2" | "h3";
  /** Footnote under the group. */
  footer?: ReactNode;
  /** Accessible name when there is no visible title. */
  label?: string;
  "aria-busy"?: boolean;
  className?: string;
  /** <ListRow> elements (each renders an <li>). */
  children: ReactNode;
}

/**
 * Inset grouped list: white surface, 14px radius, hairline border, rows separated by
 * inset hairlines (drawn by ListRow and hidden on the first row).
 */
export function GroupedList({
  title,
  headingLevel: Heading = "h2",
  footer,
  label,
  className,
  children,
  ...rest
}: GroupedListProps) {
  const headingId = useId();
  return (
    <div className={className}>
      {title && (
        <Heading id={headingId} className="eyebrow mb-2.5 px-4">
          {title}
        </Heading>
      )}
      <ul
        aria-labelledby={title ? headingId : undefined}
        aria-label={title ? undefined : label}
        aria-busy={rest["aria-busy"] || undefined}
        className="overflow-hidden rounded-row border border-hairline bg-surface [&>li:first-child_[data-divider]]:border-t-0"
      >
        {children}
      </ul>
      {footer && <div className="mt-2.5 px-4 text-footnote font-normal text-ink-2">{footer}</div>}
    </div>
  );
}
