import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../utils/cn";

type CardElement = "div" | "article" | "section" | "aside" | "li";

interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: CardElement;
  /** Inner padding. "none" lets children (tables, headers) control spacing. */
  padding?: "none" | "sm" | "md" | "lg";
  /** Adds a hover lift for clickable cards. */
  interactive?: boolean;
  children?: ReactNode;
}

const paddings = { none: "", sm: "p-4", md: "p-5 sm:p-6", lg: "p-6 sm:p-8" } as const;

export function Card({
  as: Tag = "div",
  padding = "md",
  interactive = false,
  className,
  children,
  ...rest
}: CardProps) {
  return (
    <Tag
      className={cn(
        "rounded-xl border border-slate-200 bg-white shadow-card",
        interactive &&
          "transition-[box-shadow,border-color,transform] duration-150 hover:-translate-y-0.5 hover:border-augie-blue-200 hover:shadow-card-hover",
        paddings[padding],
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}

interface CardHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function CardHeader({ title, description, actions, className }: CardHeaderProps) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-3", className)}>
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {description && <p className="mt-1 text-sm text-slate-600">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
