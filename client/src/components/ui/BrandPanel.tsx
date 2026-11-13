import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../utils/cn";

type BrandPanelElement = "div" | "section" | "article";

interface BrandPanelProps extends HTMLAttributes<HTMLElement> {
  as?: BrandPanelElement;
  children?: ReactNode;
}

/**
 * The navy brand surface (one per screen at most): navy-900, 24px radius, a faint 1px inner
 * highlight and a soft gold glow in one corner. Children are on a dark surface — use light text,
 * gold accents, and the gold button. Focus rings switch to gold (`.on-navy`).
 */
export function BrandPanel({ as: Tag = "div", className, children, ...rest }: BrandPanelProps) {
  return (
    <Tag
      className={cn(
        "on-navy relative isolate overflow-hidden rounded-feature bg-navy-900 text-white",
        "shadow-[inset_0_1px_0_rgb(255_255_255/0.08),0_8px_30px_rgb(8_30_63/0.12)]",
        className,
      )}
      {...rest}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-28 -right-28 -z-10 size-72 rounded-full bg-gold/10 blur-3xl"
      />
      {children}
    </Tag>
  );
}
