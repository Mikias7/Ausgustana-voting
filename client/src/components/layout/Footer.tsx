import { Link } from "react-router-dom";
import { ExternalLink, Mail, MapPin, Phone } from "lucide-react";
import { Container } from "../ui/Container";
import { ASA_CONTACT, BRAND } from "./brand";

const linkClass = "rounded-sm text-augie-blue-100 transition-colors hover:text-white";

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="on-dark mt-auto bg-augie-blue-950 text-augie-blue-100">
      <div className="h-[3px] bg-augie-gold" aria-hidden="true" />
      <Container className="py-12">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-5">
            <div className="flex items-center gap-3">
              <img src={BRAND.logoLight} alt="" className="size-14" width={56} height={56} />
              <div>
                <p className="font-serif text-xl font-semibold text-white">{BRAND.appName}</p>
                <p className="text-sm text-augie-gold-200">{BRAND.orgName}</p>
              </div>
            </div>
            <p className="mt-4 max-w-sm text-sm leading-relaxed">
              The official voting platform for student government and student organizations at Augustana
              University, run by the Augustana Student Association.
            </p>
          </div>

          <nav aria-label="Footer" className="md:col-span-3">
            <h2 className="font-sans text-xs font-semibold tracking-[0.14em] text-white uppercase">Platform</h2>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li><Link to="/elections" className={linkClass}>Elections</Link></li>
              <li><Link to="/elections?tab=past" className={linkClass}>Past results</Link></li>
              <li><Link to="/about" className={linkClass}>About &amp; privacy</Link></li>
              <li><Link to="/contact" className={linkClass}>Contact</Link></li>
            </ul>
          </nav>

          <div className="md:col-span-4">
            <h2 className="font-sans text-xs font-semibold tracking-[0.14em] text-white uppercase">Contact ASA</h2>
            <address className="mt-4 space-y-2.5 text-sm not-italic">
              <p className="flex items-start gap-2.5">
                <Mail className="mt-0.5 size-4 shrink-0 text-augie-gold" aria-hidden="true" />
                <a href={`mailto:${ASA_CONTACT.email}`} className={linkClass}>{ASA_CONTACT.email}</a>
              </p>
              <p className="flex items-start gap-2.5">
                <Phone className="mt-0.5 size-4 shrink-0 text-augie-gold" aria-hidden="true" />
                <a href={ASA_CONTACT.phoneHref} className={linkClass}>{ASA_CONTACT.phone}</a>
              </p>
              <p className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 size-4 shrink-0 text-augie-gold" aria-hidden="true" />
                <span>
                  {ASA_CONTACT.addressLines[0]}
                  <br />
                  {ASA_CONTACT.addressLines[1]}
                </span>
              </p>
              <p className="flex items-start gap-2.5">
                <ExternalLink className="mt-0.5 size-4 shrink-0 text-augie-gold" aria-hidden="true" />
                <a href={ASA_CONTACT.website} className={linkClass} target="_blank" rel="noreferrer">
                  ASA on augie.edu<span className="sr-only"> (opens in a new tab)</span>
                </a>
              </p>
            </address>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-white/10 pt-6 text-xs text-augie-blue-200 sm:flex-row sm:items-center sm:justify-between">
          <p>A platform of the Augustana Student Association · Augustana University</p>
          <p>© {year} Augustana Student Association</p>
        </div>
      </Container>
    </footer>
  );
}
