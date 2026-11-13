import type { ReactNode } from "react";
import { cn } from "../../utils/cn";
import type { BadgeTone } from "../../utils/elections";

export type { BadgeTone };

const tones: Record<BadgeTone, string> = {
  green: "bg-emerald-50 text-emerald-800 ring-emerald-600/25",
  blue: "bg-augie-blue-50 text-augie-blue-700 ring-augie-blue-600/25",
  slate: "bg-slate-100 text-slate-700 ring-slate-500/25",
  gold: "bg-augie-gold-100 text-augie-gold-900 ring-augie-gold-600/40",
  red: "bg-red-50 text-red-800 ring-red-600/25",
  amber: "bg-amber-50 text-amber-800 ring-amber-600/30",
  navy: "bg-augie-blue text-white ring-augie-blue",
};

const dots: Record<BadgeTone, string> = {
  green: "bg-emerald-500",
  blue: "bg-augie-blue-500",
  slate: "bg-slate-400",
  gold: "bg-augie-gold-600",
  red: "bg-red-500",
  amber: "bg-amber-500",
  navy: "bg-augie-gold",
};

interface BadgeProps {
  tone?: BadgeTone;
  icon?: ReactNode;
  /** Shows a small status dot before the label. */
  dot?: boolean;
  className?: string;
  children: ReactNode;
}

export function Badge({ tone = "slate", icon, dot = false, className, children }: BadgeProps) {
  return (
    <span
      data-tone={tone}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset",
        tones[tone],
        className,
      )}
    >
      {dot && <span aria-hidden="true" className={cn("size-1.5 rounded-full", dots[tone])} />}
      {icon}
      {children}
    </span>
  );
}
