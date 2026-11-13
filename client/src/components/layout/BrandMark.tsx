import { Link } from "react-router-dom";
import { cn } from "../../utils/cn";
import { BRAND } from "./brand";

/** Navy logo mark + "ASA Elections", linking home. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <Link
      to="/"
      className={cn("inline-flex min-h-11 items-center gap-2.5 rounded-full pr-2 text-[0.9375rem] font-semibold tracking-[-0.01em] text-ink", className)}
    >
      <img src={BRAND.mark} alt="" className="h-8 w-auto shrink-0" width={30} height={32} />
      <span className="whitespace-nowrap">{BRAND.appName}</span>
    </Link>
  );
}
