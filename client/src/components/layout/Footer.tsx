import { Link } from "react-router-dom";
import { BrandRule } from "../ui/BrandRule";
import { ASA_CONTACT, BRAND } from "./brand";

const linkClass = "rounded-[4px] text-navy-200 transition-colors duration-160 hover:text-gold";

/**
 * Full-bleed navy band. On mobile it also carries the bottom padding that clears the floating
 * tab bar, so the navy runs behind the tab bar and the safe area.
 */
export function Footer() {
  return (
    <footer className="on-navy mt-auto bg-navy-900 pb-[calc(var(--tabbar-space)+16px)] text-navy-200 md:pb-0">
      <div className="mx-auto w-full max-w-[calc(1120px+4rem)] px-6 sm:px-8">
        <div className="flex flex-col gap-6 py-10 text-footnote font-normal sm:flex-row sm:items-start sm:gap-5">
          {/* The navy emblem on a small white tile: the light logo's ring is illegible this small. */}
          <span className="flex size-11 shrink-0 items-center justify-center rounded-[12px] bg-white">
            <img src={BRAND.mark} alt="" className="h-7 w-auto" width={26} height={28} />
          </span>
          <div className="space-y-2">
            <BrandRule size="lg" className="mb-3" />
            <p>
              <span className="font-semibold text-white">{BRAND.appName}</span> — a platform of the {BRAND.orgName},{" "}
              {BRAND.university}.
            </p>
            <p className="flex flex-wrap gap-x-3 gap-y-1">
              <a href={`mailto:${ASA_CONTACT.email}`} className={linkClass}>
                {ASA_CONTACT.email}
              </a>
              <span aria-hidden="true">·</span>
              <a href={ASA_CONTACT.phoneHref} className={`${linkClass} tabular`}>
                {ASA_CONTACT.phone}
              </a>
            </p>
          </div>
          <nav aria-label="Footer" className="sm:ml-auto">
            <ul className="flex flex-wrap gap-x-5 gap-y-2">
              <li>
                <Link to="/about" className={linkClass}>
                  About
                </Link>
              </li>
              <li>
                <Link to="/contact" className={linkClass}>
                  Contact
                </Link>
              </li>
              <li>
                <a href={ASA_CONTACT.website} target="_blank" rel="noreferrer" className={linkClass}>
                  ASA website<span className="sr-only"> (opens in a new tab)</span>
                </a>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  );
}
