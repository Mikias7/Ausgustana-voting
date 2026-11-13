# Design System — ASA Elections

Direction: **calm, precise, premium.** Inspired by Apple's design philosophy (clarity, deference to content, depth used sparingly) while carrying Augustana University's identity. Typography and whitespace do the work; color is reserved for meaning.

## 1. Why the previous UI felt dated
- A full-width solid navy header bar — heavy, takes space, reads as a 2010s corporate site.
- A saturated "web" blue (`#003087`) that isn't Augustana's navy.
- Serif headings mixed with sans body → busy, editorial-template feel.
- Card grids with borders + shadows everywhere; colorful pill badges competing for attention.
- Gold used as decoration rather than meaning.

## 2. Brand source
Values taken from augie.edu's own stylesheet (`--color-navy`, `--color-gold`, etc.):

| Augustana token | Hex | Our use |
|---|---|---|
| navy | `#081E3F` | Primary: brand, primary buttons, strong text |
| blue | `#002561` | Hover/pressed state of primary |
| gold | `#FED102` | Accent — tiny, meaningful moments only (your-ballot marker, focus on dark) |
| warm white | `#FCFBFA` | Page canvas |
| light bg | `#F5F5F5` | Inset/grouped backgrounds |
| blue tint | `#E7EDF5` | Selected/active surfaces |
| border | `#DCDFE4` | Hairlines (we use a lighter alpha version) |
| gray | `#4C5667` | Secondary text |
| slate | `#AAB7CD` | Logo secondary tone, disabled |

Augustana's typefaces are Gotham (licensed) and Lato. We use **Inter Variable** — free, already installed, geometric like Gotham and close to Apple's SF Pro. No serif.

Logo: `client/public/brand/asa-logo-navy.png` (recolored to exact brand navy/slate) on light surfaces. `asa-logo-light.png` only if a dark surface is ever used.

## 3. Tokens (Tailwind v4 `@theme`)

**Color**
```
--color-navy-50  #F3F5F9   --color-navy-500 #4A5D7E
--color-navy-100 #E7EDF5   --color-navy-600 #2C4166
--color-navy-200 #CFD8E6   --color-navy-700 #16294A
--color-navy-300 #AAB7CD   --color-navy-800 #0D2247
--color-navy-400 #7486A5   --color-navy-900 #081E3F  ← brand
                           --color-navy-950 #04122A
--color-gold     #FED102   --color-gold-600 #8A6D00 (only if gold text is ever needed; AA on white)
--color-canvas   #FCFBFA   (page)
--color-surface  #FFFFFF   (raised)
--color-inset    #F5F5F4   (grouped list background, inputs)
--color-ink      #0B1A33   (primary text — navy-tinted near-black)
--color-ink-2    #4C5667   (secondary text)
--color-ink-3    #8B93A1   (tertiary / meta; large text or icons only, ≥3:1)
--color-hairline rgb(8 30 63 / 0.08)   (borders/dividers)
--color-success  #1E8E4E   --color-danger #C4372C   --color-warning #B26A00
```
Rule: **one** accent color per view. Status uses a 6px dot + text, never a filled colored pill.

**Typography** (Inter, `font-feature-settings: "cv11", "ss01"`; tabular numbers for dates/counts)
| Role | Size / line / weight / tracking |
|---|---|
| Display (home hero) | 56–72px / 1.02 / 600 / −0.035em (clamp) |
| Large title (page h1) | 40px / 1.1 / 600 / −0.03em |
| Title 2 (section) | 24px / 1.2 / 600 / −0.02em |
| Title 3 (card/row title) | 17px / 1.35 / 600 / −0.01em |
| Body | 16px / 1.55 / 400 |
| Callout / secondary | 15px / 1.5 / 400, ink-2 |
| Footnote / meta | 13px / 1.4 / 500, ink-2 |
| Eyebrow | 12px / 1 / 600 / +0.08em uppercase, ink-3 |

**Spacing** — 4px base. Section gaps 64–96px desktop, 48px mobile. Page side padding 24px mobile, 32px tablet; content max width 1120px; reading width 680px.

**Radius** — 10px controls, 14px rows/inputs groups, 20px panels, full for pills/avatars/nav.

**Elevation** — almost flat. Panels: hairline border, no shadow. Floating elements only (nav, menus, dialogs): `0 8px 30px rgb(8 30 63 / 0.08), 0 1px 2px rgb(8 30 63 / 0.06)`.

**Motion** — 160ms (hover/press), 240ms (enter), easing `cubic-bezier(0.2, 0.8, 0.2, 1)`. Fade + 4px rise on page/section enter. Press: `scale(0.98)`. All disabled under `prefers-reduced-motion`.

**Focus** — 2px navy ring with 2px canvas offset (`outline: 2px solid navy-900; outline-offset: 2px`), rounded to element.

## 4. Navigation
**Desktop/tablet (≥768px): floating glass pill**, centered, `sticky top-4`, `bg-white/75 backdrop-blur-xl saturate-150`, hairline border, floating shadow, height 52px.
- Left: navy logo mark (28px) + "ASA Elections" (15px/600).
- Center: Home · Elections · About · Contact. Active link = navy-100 pill background behind text with smooth transition; inactive = ink-2, hover ink.
- Right: "Sign in" (small navy pill button) or 32px initials avatar → popover menu (name, class, Profile, Admin if allowed, Sign out).
- Page content starts below with generous space; the nav never spans full width.

**Mobile (<768px):**
- Slim top row (not a bar): logo + "ASA Elections" left, avatar/Sign in right, on canvas (becomes glass on scroll).
- **Floating bottom tab bar** (iOS style): Home, Elections, Profile (or Sign in), More (opens a sheet with About, Contact, Admin). Glass pill, safe-area aware, 44px+ touch targets, active = navy icon + label, inactive = ink-3.

**Admin:** refined sidebar like macOS System Settings — 248px, canvas background, grouped sections with small eyebrow labels, rows with icon + label, active row = navy-100 background, navy text. Collapses to a top segmented menu/sheet on mobile. "← Back to site" at top.

**Footer:** minimal. Hairline top, two short lines in footnote size: "ASA Elections — a platform of the Augustana Student Association, Augustana University." and contact (asa@ole.augie.edu · 605.274.4427) + links (About, Contact, ASA website). Small navy logo.

## 5. Components
- **Button**: pill radius (full), heights 36/44/52. `primary` navy-900 bg, white text, hover navy-800/`#002561`; `secondary` white bg + hairline + ink; `tinted` navy-100 bg navy-900 text; `ghost` text-only ink-2 → ink; `danger`. Press scale 0.98. Loading spinner replaces icon, keeps width.
- **Segmented control** (replaces tabs visually; keep accessible tab semantics): inset bg, sliding white thumb with subtle shadow, 36px tall.
- **Status indicator**: dot + label. Open = success dot (with soft pulse ring, disabled for reduced motion) "Open"; Upcoming = navy-400 dot; Closed = ink-3 dot; Cancelled = danger dot; Draft = warning dot.
- **Eligibility**: quiet text chips: "You can vote" (navy-100 bg, navy text, check icon) · "Voted" (check-circle, success text) · "Not eligible" (ink-3 text, no bg). A 6px gold dot marks *your* positions on the detail page.
- **Grouped list** (core pattern, iOS inset grouped): white surface, 14px radius, hairline border, rows separated by inset hairlines, row = optional icon/leading + title/subtitle + trailing meta + chevron; hover inset bg.
- **ElectionCard** → two variants: `row` (grouped-list row: title, org · dates, status, eligibility, chevron) used in lists; `feature` (large panel for the live election on Home with countdown "Closes in 2 days", CTA).
- **Panel**: white, 20px radius, hairline. Used sparingly.
- **Inputs**: inset bg, no border until focus (hairline), 44px, 12px radius; label 13px/500 above; error text danger 13px.
- **Empty state**: centered, thin-stroke icon in a 48px navy-50 circle, title 17px/600, one line ink-2, optional button. No illustrations.
- **Skeletons**: inset-colored rounded blocks with soft shimmer (respect reduced motion).
- **Avatar**: initials, navy-100 bg navy-900 text, circle.
- **Modal/Dialog**: centered, 20px radius, floating shadow, scrim `rgb(4 18 42 / 0.4)` + backdrop-blur-sm, scale-in 240ms.

## 6. Page compositions
**Home**
1. Hero on canvas (no colored block): eyebrow "Augustana Student Association"; display headline "Your voice. Your vote."; one-line subhead ink-2; buttons: primary "View elections", ghost "How it works →" (About). Right side (desktop) or below: the **feature panel** of the most urgent open election (or a calm "No elections are open right now — next: …" state).
2. "Open now" — grouped list.
3. "Coming up" — grouped list (max 3 + "See all").
4. "Recent results" — grouped list.
5. "Announcements" — editorial list: date (meta) left column, title + body right, hairline separators.
Section headers: Title 2 + trailing "See all ›" link.

**Elections** — Large title "Elections" + one-line description; segmented control (Active / Upcoming / Past) + quiet organization select on the right; grouped list of ElectionCard rows; skeleton rows; empty state per tab.

**Election detail** — back link "‹ Elections"; eyebrow = organization; large title; meta line (status · dates); description at reading width. Two columns ≥1024px: main = positions; aside = sticky **action panel** (status, time remaining, your eligibility explanation, primary CTA). Mobile: action panel becomes a sticky bottom bar above tab bar. Each position: Title 3 + meta ("1 seat · Choose 1"), gold dot + "On your ballot" when eligible; candidates as a clean grid of minimal tiles (avatar 48px, name, 2-line bio), no heavy borders.

**Profile** — Apple ID–style header: 80px avatar, name (Large title), email. Grouped lists: "Student" (Class, Username, Roster status), "Eligibility" (plain-language explanation), "Voting history" (rows: election, org, date; empty state). Footnote with lock icon: "Your ballot choices are private and never shown — not to you, administrators, or anyone else."

**Login** — centered on canvas, max 420px: navy logo 56px, "Sign in" large title, subtitle; dev notice as quiet inset callout; search input; grouped list of accounts by section (Administrators, Seniors, …); row = avatar + name + username/class + chevron.

**About** — reading-width editorial page: large title, lead paragraph, three short sections with thin-stroke icons (Eligibility, Privacy, Integrity), ASA credit.

**Contact** — two columns: left = contact grouped list (email, phone, address, website) ; right = form in a panel.

**Not found / placeholders** — large faint "404" in navy-100, title, button home. Placeholder pages use the empty-state pattern with a "Coming soon" eyebrow.

## 7. Accessibility
WCAG AA contrast (ink-3 only for ≥18px or non-essential meta paired with text); 44px touch targets; visible focus; semantic landmarks; skip link; reduced-motion respected; status never conveyed by color alone (dot + text).
