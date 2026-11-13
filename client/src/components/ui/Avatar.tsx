import { useState } from "react";
import { cn } from "../../utils/cn";
import { initials } from "../../utils/text";

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizes = { sm: "size-8 text-xs", md: "size-10 text-sm", lg: "size-14 text-lg", xl: "size-20 text-2xl" } as const;

/** Photo with an initials fallback (also used when the image fails to load). */
export function Avatar({ name, src, size = "md", className }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const classes = cn("shrink-0 rounded-full", sizes[size], className);

  if (src && !failed) {
    return <img src={src} alt="" className={cn(classes, "object-cover")} onError={() => setFailed(true)} />;
  }
  return (
    <span
      aria-hidden="true"
      className={cn(
        classes,
        "inline-flex items-center justify-center bg-augie-blue-100 font-serif font-semibold text-augie-blue-800 ring-2 ring-white",
      )}
    >
      {initials(name)}
    </span>
  );
}
