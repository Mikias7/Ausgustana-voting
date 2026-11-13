import { useScrolled } from "../../hooks/useScrolled";
import { cn } from "../../utils/cn";
import { AccountControl } from "./AccountControl";
import { BrandMark } from "./BrandMark";

/** Mobile (<768px): slim top row on the canvas that turns to glass once the page scrolls. */
export function MobileHeader() {
  const scrolled = useScrolled();
  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b pt-[env(safe-area-inset-top)] transition-[background-color,border-color] duration-240 ease-apple md:hidden",
        scrolled ? "glass border-hairline" : "border-transparent bg-canvas",
      )}
    >
      <div className="flex h-14 items-center justify-between px-4">
        <BrandMark />
        <AccountControl className="h-11" />
      </div>
    </header>
  );
}
