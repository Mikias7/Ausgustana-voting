import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../utils/cn";

interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
  /** Content width: compact = 420px, reading = 680px, narrow = 880px, default = 1120px. */
  size?: "compact" | "reading" | "narrow" | "default";
  /** Fade + 4px rise on mount (page enter). */
  animate?: boolean;
  children?: ReactNode;
}

// Max widths include the side padding so the *content* width matches the design.
const sizes = {
  compact: "max-w-[calc(420px+3rem)] sm:max-w-[calc(420px+4rem)]",
  reading: "max-w-[calc(680px+3rem)] sm:max-w-[calc(680px+4rem)]",
  narrow: "max-w-[calc(880px+4rem)]",
  default: "max-w-[calc(1120px+4rem)]",
} as const;

/** Centered page column: 24px side padding on mobile, 32px from tablet. */
export function Container({ size = "default", animate = true, className, children, ...rest }: ContainerProps) {
  return (
    <div className={cn("mx-auto w-full px-6 sm:px-8", sizes[size], animate && "animate-enter", className)} {...rest}>
      {children}
    </div>
  );
}
