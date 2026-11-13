/** ASA brand assets and contact details (single source for layout + pages). */
export const BRAND = {
  /** Full navy logo (with the circular wordmark ring) — large uses only (Login, About). */
  logo: "/brand/asa-logo-navy.png",
  /** Emblem only (knight + ASA + ship) — legible at small sizes (nav, footer, favicon). */
  mark: "/brand/asa-mark-navy.png",
  /** Only for dark surfaces, if one is ever used. */
  logoLight: "/brand/asa-logo-light.png",
  appName: "ASA Elections",
  orgName: "Augustana Student Association",
  university: "Augustana University",
} as const;

export const ASA_CONTACT = {
  email: "asa@ole.augie.edu",
  phone: "605.274.4427",
  phoneHref: "tel:+16052744427",
  addressLines: ["2001 S. Summit Avenue", "Sioux Falls, SD 57197"],
  website: "https://www.augie.edu/augustana-student-association",
} as const;

/** Primary site navigation (floating nav on desktop; tab bar + More sheet on mobile). */
export const NAV_LINKS = [
  { to: "/", label: "Home", end: true },
  { to: "/elections", label: "Elections", end: false },
  { to: "/about", label: "About", end: false },
  { to: "/contact", label: "Contact", end: false },
] as const;
