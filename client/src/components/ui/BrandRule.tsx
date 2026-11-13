import { cn } from "../../utils/cn";

interface BrandRuleProps {
  /** sm = 16×2px (section titles), md = 32×3px (hero, sign in), lg = 48×2px (footer). */
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizes = { sm: "h-0.5 w-4", md: "h-[3px] w-8", lg: "h-0.5 w-12" } as const;

/** The short gold rule — the single repeated brand motif. Decorative. */
export function BrandRule({ size = "sm", className }: BrandRuleProps) {
  return <span aria-hidden="true" className={cn("block shrink-0 rounded-full bg-gold", sizes[size], className)} />;
}
