import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../utils/cn";

interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg";
  children?: ReactNode;
}

const sizes = { sm: "max-w-3xl", md: "max-w-5xl", lg: "max-w-7xl" } as const;

export function Container({ size = "lg", className, children, ...rest }: ContainerProps) {
  return (
    <div className={cn("mx-auto w-full px-4 sm:px-6 lg:px-8", sizes[size], className)} {...rest}>
      {children}
    </div>
  );
}
