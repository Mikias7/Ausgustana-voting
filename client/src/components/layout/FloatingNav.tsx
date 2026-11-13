import { NavLink } from "react-router-dom";
import { cn } from "../../utils/cn";
import { AccountControl } from "./AccountControl";
import { BrandMark } from "./BrandMark";
import { NAV_LINKS } from "./brand";

function linkClass({ isActive }: { isActive: boolean }) {
  return cn(
    "relative inline-flex h-9 items-center rounded-full px-3.5 text-[0.875rem] font-medium transition-colors duration-160 ease-apple lg:px-4",
    isActive ? "bg-navy-100 text-navy-900" : "text-ink-2 hover:text-ink",
  );
}

/** Desktop/tablet (≥768px): centered floating glass pill — brand, links, account. */
export function FloatingNav() {
  return (
    <header className="sticky top-4 z-40 hidden px-8 md:block">
      <div className="glass mx-auto grid h-[52px] max-w-[880px] grid-cols-[1fr_auto_1fr] items-center rounded-full border border-hairline pr-1 pl-3.5 shadow-float">
        <BrandMark className="justify-self-start" />
        <nav aria-label="Main">
          <ul className="flex items-center gap-0.5">
            {NAV_LINKS.map((link) => (
              <li key={link.to}>
                <NavLink to={link.to} end={link.end} className={linkClass}>
                  {({ isActive }) => (
                    <>
                      {link.label}
                      {isActive && (
                        <span
                          aria-hidden="true"
                          className="absolute bottom-[3px] left-1/2 size-1 -translate-x-1/2 rounded-full bg-gold"
                        />
                      )}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex justify-self-end pr-1">
          <AccountControl />
        </div>
      </div>
    </header>
  );
}
