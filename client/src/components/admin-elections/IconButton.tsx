import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../../utils/cn";

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  /** Accessible name (also the tooltip). */
  label: string;
  icon: ReactNode;
  tone?: "default" | "danger";
}

/** Round icon-only button: 44px on touch widths, 36px from `sm`. */
export function IconButton({ label, icon, tone = "default", className, type = "button", ...rest }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex size-11 shrink-0 items-center justify-center rounded-full transition-colors duration-160 sm:size-9",
        "disabled:pointer-events-none disabled:opacity-35 [&_svg]:size-[18px]",
        tone === "danger" ? "text-ink-2 hover:bg-danger/8 hover:text-danger" : "text-ink-2 hover:bg-inset hover:text-ink",
        className,
      )}
      {...rest}
    >
      {icon}
    </button>
  );
}
