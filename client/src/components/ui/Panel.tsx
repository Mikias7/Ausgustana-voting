import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../utils/cn";

type PanelElement = "div" | "section" | "article" | "aside";

interface PanelProps extends HTMLAttributes<HTMLElement> {
  as?: PanelElement;
  /** Inner padding. "none" lets children control spacing. */
  padding?: "none" | "md" | "lg";
  children?: ReactNode;
}

const paddings = { none: "", md: "p-5 sm:p-6", lg: "p-6 sm:p-8" } as const;

/** White surface, 20px radius, hairline border, no shadow. Use sparingly. */
export function Panel({ as: Tag = "div", padding = "md", className, children, ...rest }: PanelProps) {
  return (
    <Tag className={cn("rounded-panel border border-hairline bg-surface", paddings[padding], className)} {...rest}>
      {children}
    </Tag>
  );
}
