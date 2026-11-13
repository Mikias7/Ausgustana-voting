import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "../../utils/cn";

interface ListRowProps {
  title: ReactNode;
  /** Wrap the title in a heading to keep the page outline (e.g. election rows). */
  titleAs?: "h2" | "h3" | "p";
  /** Title 3 (17px/600) instead of body weight. */
  prominent?: boolean;
  subtitle?: ReactNode;
  /** Icon or avatar before the text. */
  leading?: ReactNode;
  /** Meta at the end (wraps under the text on narrow screens). Must not be interactive. */
  trailing?: ReactNode;
  /** Keep `trailing` on the same line at every width (short key/value rows). */
  inlineTrailing?: boolean;
  /** Router link target. */
  to?: string;
  /** Plain anchor target (mailto:, tel:, external). */
  href?: string;
  /** Opens `href` in a new tab and announces it. */
  external?: boolean;
  /** Makes the row a button. */
  onClick?: () => void;
  disabled?: boolean;
  busy?: boolean;
  /** Extra screen-reader text appended to the action's name. */
  srSuffix?: string;
  /** Replaces the chevron (e.g. spinner or external icon). */
  accessory?: ReactNode;
  /** Defaults to true for interactive rows. */
  chevron?: boolean;
  /** Gold bar on the left edge on hover/focus (brand accent for election rows). */
  accent?: boolean;
  className?: string;
}

/**
 * One row of a GroupedList (renders an <li>). Interactive rows use a stretched link/button
 * on the title so the whole row is clickable while the accessible name stays the title.
 */
export function ListRow({
  title,
  titleAs: TitleTag = "p",
  prominent = false,
  subtitle,
  leading,
  trailing,
  inlineTrailing = false,
  to,
  href,
  external = false,
  onClick,
  disabled,
  busy,
  srSuffix,
  accessory,
  chevron,
  accent = false,
  className,
}: ListRowProps) {
  const interactive = Boolean(to || href || onClick);
  const showChevron = chevron ?? interactive;
  const actionClass = cn(
    "rounded-[4px] text-left after:absolute after:inset-0 after:z-0 after:rounded-[13px] after:content-['']",
    "focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-navy-900",
  );
  const suffix = srSuffix && <span className="sr-only"> {srSuffix}</span>;

  let label: ReactNode = title;
  if (to) {
    label = (
      <Link to={to} className={actionClass}>
        {title}
        {suffix}
      </Link>
    );
  } else if (href) {
    label = (
      <a
        href={href}
        className={actionClass}
        {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
      >
        {title}
        {suffix}
        {external && <span className="sr-only"> (opens in a new tab)</span>}
      </a>
    );
  } else if (onClick) {
    label = (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-busy={busy || undefined}
        className={cn(actionClass, "disabled:cursor-default")}
      >
        {title}
        {suffix}
      </button>
    );
  }

  return (
    <li
      className={cn(
        "group/row relative flex items-stretch pl-4 transition-colors duration-160",
        interactive && !disabled && "hover:bg-inset/80",
        disabled && !busy && "opacity-60",
        className,
      )}
    >
      {accent && interactive && (
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-[3px] origin-center scale-y-0 bg-gold transition-transform duration-160 ease-apple group-focus-within/row:scale-y-100 group-hover/row:scale-y-100"
        />
      )}
      {leading && <div className="flex shrink-0 items-center py-3 pr-3.5 text-navy-900">{leading}</div>}
      <div data-divider className="flex min-w-0 flex-1 items-center gap-3 border-t border-hairline py-3 pr-4">
        <div className={cn("min-w-0 flex-1", inlineTrailing ? "flex items-center gap-4" : "sm:flex sm:items-center sm:gap-4")}>
          <div className="min-w-0 flex-1">
            <TitleTag className={cn("text-ink", prominent ? "text-title-3" : "text-body font-medium")}>{label}</TitleTag>
            {subtitle && <div className="mt-0.5 text-footnote font-normal text-ink-2">{subtitle}</div>}
          </div>
          {trailing && (
            <div
              className={cn(
                "flex flex-wrap items-center gap-x-3 gap-y-1 text-footnote text-ink-2",
                inlineTrailing ? "max-w-[60%] shrink-0 justify-end text-right" : "mt-1.5 sm:mt-0 sm:shrink-0 sm:justify-end",
              )}
            >
              {trailing}
            </div>
          )}
        </div>
        {accessory ??
          (showChevron && (
            <ChevronRight
              className="size-[18px] shrink-0 text-ink-3 transition-transform duration-160 ease-apple group-focus-within/row:translate-x-0.5 group-hover/row:translate-x-0.5"
              aria-hidden="true"
            />
          ))}
      </div>
    </li>
  );
}
