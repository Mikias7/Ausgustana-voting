import { cn } from "../../utils/cn";

interface SkeletonProps {
  className?: string;
}

/** Inset-colored placeholder with a soft shimmer. Decorative; pair with an sr-only status. */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative overflow-hidden rounded-[8px] bg-inset",
        "before:absolute before:inset-0 before:animate-shimmer before:bg-linear-to-r before:from-transparent before:via-white/70 before:to-transparent before:content-['']",
        className,
      )}
    />
  );
}
