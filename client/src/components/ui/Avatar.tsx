import { useState } from "react";
import { cn } from "../../utils/cn";
import { initials } from "../../utils/text";

interface AvatarProps {
  name: string;
  src?: string | null;
  /** 32 / 40 / 48 / 80px */
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizes = {
  sm: "size-8 text-[0.75rem]",
  md: "size-10 text-[0.875rem]",
  lg: "size-12 text-[1rem]",
  xl: "size-20 text-[1.75rem]",
} as const;

/** Photo with an initials fallback (also used when the image fails to load). */
export function Avatar({ name, src, size = "md", className }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const classes = cn("shrink-0 rounded-full", sizes[size], className);

  if (src && !failed) {
    return <img src={src} alt="" className={cn(classes, "bg-inset object-cover")} onError={() => setFailed(true)} />;
  }
  return (
    <span
      aria-hidden="true"
      className={cn(classes, "inline-flex items-center justify-center bg-navy-100 font-semibold tracking-tight text-navy-900")}
    >
      {initials(name)}
    </span>
  );
}
