import { cn } from "../../utils/cn";

interface SkeletonProps {
  className?: string;
}

/** Placeholder shape shown while content loads. Decorative; pair with an sr-only status. */
export function Skeleton({ className }: SkeletonProps) {
  return <div aria-hidden="true" className={cn("animate-pulse rounded-md bg-slate-200/80", className)} />;
}
