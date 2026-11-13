# Augustana Voting Platform — Architecture (Phase 2 draft)

> Status: **approved — foundation in progress.**
> Built for the **Augustana Student Association (ASA)**, Augustana University.

---

## 1. Decisions so far

| Topic | Decision |
|---|---|
| Frontend | Vite + React + TypeScript, Tailwind CSS, React Router, Lucide icons |
| Backend | Node.js + Express + TypeScript, zod validation |
| Database | PostgreSQL (v18 is installed locally) + Prisma ORM |
| Sessions | `express-session` stored in Postgres, httpOnly cookies |
| Login | **Deferred.** A development-only "sign in as" picker behind a pluggable auth provider; real SSO/email login is added later without touching the voting code |
| Ballot format | **Admin chooses per position** |
| Seats / eligibility | **Admin defines per position** |
| Results visibility & release | **Admin chooses per election** |
| Hosting | Deferred. Designed for Linux + Apache reverse proxy → Node |

---

## 2. Student roster file (from `sampleData.txt`)

Pipe-delimited, **no header row**, CRLF line endings, 5 fields:

```
Lastname | Firstname | username | email                    | class code
Lastname1|Firstname1|username1|username1@ole.augie.edu|FF
```

Observations from the sample:
- Class codes seen: `FF`, `SO`, `JR`, `SR`. **`FF` is not `FR`** — codes are mapped through a configurable table, not hard-coded.
- Line 3 has an invalid email (`username3le.augie.edu`) → must be rejected/flagged.
- Line 4 has only 4 fields (missing `|` between username and email) → must be rejected.
- There is no numeric student ID. **`username` is the stable key** (lowercased); email is secondary.

### Import pipeline

1. Admin uploads the file → server parses it **in memory** (the file is never stored on disk or committed).
2. **Dry run** first: returns a preview summary (new / updated / unchanged / skipped / errors with line numbers and reasons).
3. Admin confirms → the same parse runs inside **one database transaction**.
4. A `StudentImport` record keeps counts + per-line error reasons (line number, username, reason — no full row dump).

Validation per line:
| Check | Result if it fails |
|---|---|
| Exactly 5 fields | Skipped — "expected 5 fields, found N" |
| Names / username non-empty | Skipped |
| Email valid and in an allowed domain (`ole.augie.edu`, configurable) | Skipped |
| Class code in mapping table | *Open question* (see §10) |
| Duplicate username or email inside the same file | First kept, later lines skipped |
| Email local-part ≠ username | Accepted, no warning |

Import modes:
- **Merge** (default): add new students, update changed ones. Nobody is removed.
- **Full sync**: as Merge, plus students *not* in the file are marked `onRoster = false` (never deleted). Because the university list is the authority on eligibility, they lose eligibility but their account and participation history remain.

If an election is currently open, the import screen warns the admin before confirming.

---

## 3. System architecture

```
Browser ──HTTPS──▶ Apache (TLS, reverse proxy) ──▶ Node/Express :3000
                                                    ├─ /api/*   REST API
                                                    └─ /*       built React app (static)
                                                  Express ──▶ PostgreSQL
```

- Production: one Node process (systemd) serves API + built frontend → one Apache `ProxyPass` rule, no CORS.
- Development: Vite dev server proxies `/api` to Express.

### Backend layering
```
route → middleware (session, requireAuth, requireRole, validate(zod)) → controller → service → Prisma
```
- **Controllers**: HTTP only (read request, call service, send response).
- **Services**: all business logic (eligibility, voting, import, results).
- **Errors**: services throw `AppError(status, code, message)`; one error middleware formats responses.

### Frontend layering
```
pages → feature components → ui components
          ↘ hooks (useElections, useBallot, useAuth…) → api/ modules → fetch wrapper
```
Components never call `fetch` directly.

---

## 4. Core domain rules

### 4.1 Election lifecycle
Stored: `status` (`DRAFT | PUBLISHED | CANCELLED`), `startsAt`, `endsAt`, `closedAt?`, `resultsPublishedAt?`.
Derived phase (one helper, used everywhere):

| Phase | Condition |
|---|---|
| draft | status = DRAFT (admins only) |
| upcoming | PUBLISHED and now < startsAt |
| open | PUBLISHED and startsAt ≤ now < endsAt and not closed early |
| closed | PUBLISHED and (now ≥ endsAt or closedAt set) |
| cancelled | status = CANCELLED |

Once an election is **open**, positions, candidates, eligibility and start date are locked. Admins can only close it early (audited).

### 4.2 Positions & ballot format (admin-selected per position)
| Setting | Options |
|---|---|
| `votingMethod` | `SINGLE_CHOICE` (pick 1), `MULTIPLE_CHOICE` (pick up to `maxSelections`) |
| `seats` | Number of winners (top N by votes) |
| `allowAbstain` | yes / no |
| `allowWriteIn` | yes / no |

Ranked-choice voting can be added later as another `votingMethod` without schema changes beyond a `rank` column.

### 4.3 Eligibility (admin-defined per election and per position)
A rule is a small JSON object validated by zod. **One function** `isEligible(voter, rule)` evaluates it — nothing else in the codebase checks class standing.

```ts
type EligibilityRule =
  | { type: "ALL_STUDENTS" }                                  // anyone on the active roster
  | { type: "CLASS_STANDING"; classes: ClassStanding[] }      // e.g. ["FR"]
  | { type: "VOTER_LIST"; listId: string }                    // uploaded list of usernames
```
- A voter must satisfy the **election** rule *and* the **position** rule.
- Example — *ASA Senate Fall 2026*: positions *Freshman Senator* (`CLASS_STANDING [FR]`), *Sophomore Senator* (`[SO]`), …, *At-Large Senator* (`ALL_STUDENTS`), *International Senator* (`VOTER_LIST`, since the roster has no international flag).
- New rule types = one new union member + one `case` in `isEligible`.
- Eligibility is **always enforced on the server** at ballot fetch *and* at submission.

### 4.4 Voting & ballot privacy
A student submits **one ballot per election**, covering every position they are eligible for. Submission is a single transaction:

```
BEGIN
  re-check: election open, voter active, eligible for every position in the ballot,
            selections valid for each position's votingMethod
  INSERT VoterParticipation(electionId, userId)      -- UNIQUE(electionId, userId)
  INSERT Ballot(id = random UUID, electionId)        -- no userId, no timestamp
  INSERT BallotSelection(ballotId, positionId, candidateId | writeIn | abstain) …
COMMIT
```
- The **unique constraint** blocks double votes, including two simultaneous requests.
- `Ballot` has **no user reference and no timestamp**, IDs are random UUIDs → participation and ballots cannot be joined or correlated by time through the application.
- No update/delete endpoints for ballots exist.
- Results are computed by aggregation only; no API returns individual ballots.
- The voter receives a random **receipt code** (stored only as a hash on the ballot) proving their ballot was recorded.
- Audit logs record *that* someone voted, never what.

**Documented limitations (not hidden):**
- Someone with direct DB/server access watching in real time could still correlate inserts. This design protects against app users and admins, not a compromised server.
- With very few voters for a position, published totals can reveal choices (e.g., 1 voter). Admins see a warning when publishing results for positions below a configurable minimum turnout.
- Write-in text could identify a voter if they write identifying content.

### 4.5 Results (admin-selected per election)
| Setting | Options |
|---|---|
| `resultsVisibility` | `PUBLIC`, `STUDENTS` (any logged-in student), `ADMINS_ONLY` |
| `resultsRelease` | `AUTOMATIC` (when election closes) or `MANUAL` (admin clicks Publish) |
| `showTurnout` | yes / no |

---

## 5. Roles & permissions

| Role | Scope | Can |
|---|---|---|
| Student | self | View elections, vote where eligible, see own profile & participation |
| Election admin | one organization | Create/edit that org's elections, positions, candidates; view turnout; publish results |
| Org admin | one organization | Election admin + manage the org's admins |
| Platform admin | everything | All of the above for all orgs, manage organizations, import roster, view audit log |

Middleware: `requireAuth`, `requirePlatformAdmin`, `requireOrgRole(orgIdFrom, roles)`.
Admins can be staff who are not on the student roster.

---

## 6. Database schema (Prisma, draft)

```prisma
enum PlatformRole   { STUDENT PLATFORM_ADMIN }
enum OrgRole        { ORG_ADMIN ELECTION_ADMIN }
enum ClassStanding  { FR SO JR SR }
enum ElectionStatus { DRAFT PUBLISHED CANCELLED }
enum VotingMethod   { SINGLE_CHOICE MULTIPLE_CHOICE }
enum ResultsVisibility { PUBLIC STUDENTS ADMINS_ONLY }
enum ResultsRelease { AUTOMATIC MANUAL }

model User {
  id            String         @id @default(uuid())
  username      String         @unique            // roster key, lowercase
  email         String         @unique
  firstName     String
  lastName      String
  classStanding ClassStanding?
  onRoster      Boolean        @default(false)    // true = currently on university list
  platformRole  PlatformRole   @default(STUDENT)
  lastImportId  String?
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
  orgRoles      OrganizationRole[]
  participations VoterParticipation[]
}

model Organization {
  id           String  @id @default(uuid())
  name         String  @unique
  slug         String  @unique
  description  String?
  contactEmail String?
  elections    Election[]
  roles        OrganizationRole[]
}

model OrganizationRole {
  organizationId String
  userId         String
  role           OrgRole
  @@id([organizationId, userId])
}

model Election {
  id                 String            @id @default(uuid())
  organizationId     String
  title              String
  description        String?
  startsAt           DateTime
  endsAt             DateTime
  status             ElectionStatus    @default(DRAFT)
  closedAt           DateTime?
  eligibility        Json              // EligibilityRule
  resultsVisibility  ResultsVisibility @default(STUDENTS)
  resultsRelease     ResultsRelease    @default(MANUAL)
  showTurnout        Boolean           @default(true)
  resultsPublishedAt DateTime?
  createdById        String
  createdAt          DateTime          @default(now())
  updatedAt          DateTime          @updatedAt
  positions          Position[]
}

model Position {
  id            String       @id @default(uuid())
  electionId    String
  title         String
  description   String?
  seats         Int          @default(1)
  votingMethod  VotingMethod @default(SINGLE_CHOICE)
  maxSelections Int          @default(1)
  allowAbstain  Boolean      @default(true)
  allowWriteIn  Boolean      @default(false)
  eligibility   Json         // EligibilityRule
  sortOrder     Int          @default(0)
  candidates    Candidate[]
}

model Candidate {
  id         String  @id @default(uuid())
  positionId String
  name       String
  bio        String?
  photoUrl   String?
  userId     String?            // optional link to a student account
  sortOrder  Int     @default(0)
}

model VoterList {                // for VOTER_LIST eligibility (e.g. international students)
  id      String @id @default(uuid())
  name    String
  organizationId String
  members VoterListMember[]
}
model VoterListMember {
  voterListId String
  username    String
  @@id([voterListId, username])
}

// ---- Voting: identity and ballots are deliberately NOT linked ----
model VoterParticipation {
  id         String   @id @default(uuid())
  electionId String
  userId     String
  votedAt    DateTime @default(now())
  @@unique([electionId, userId])
}

model Ballot {                   // no userId, no timestamp — by design
  id          String @id @default(uuid())
  electionId  String
  receiptHash String @unique
  selections  BallotSelection[]
}

model BallotSelection {
  id          String  @id @default(uuid())
  ballotId    String
  positionId  String
  candidateId String?           // null when abstain or write-in
  writeIn     String?
  abstain     Boolean @default(false)
}

// ---- Admin / platform ----
model StudentImport {
  id          String   @id @default(uuid())
  uploadedById String
  fileName    String
  mode        String   // MERGE | FULL_SYNC
  created     Int
  updated     Int
  unchanged   Int
  deactivated Int
  skipped     Int
  issues      Json     // [{ line, username?, reason, severity }]
  createdAt   DateTime @default(now())
}

model AuditLog {
  id         String   @id @default(uuid())
  actorId    String?
  action     String   // e.g. ELECTION_PUBLISHED, ROSTER_IMPORTED
  entityType String
  entityId   String?
  metadata   Json?    // never contains ballot selections
  createdAt  DateTime @default(now())
}

model Announcement {
  id             String   @id @default(uuid())
  organizationId String?
  title          String
  body           String
  publishedAt    DateTime?
  createdAt      DateTime @default(now())
}

model ContactMessage {
  id        String   @id @default(uuid())
  name      String
  email     String
  subject   String
  message   String
  handled   Boolean  @default(false)
  createdAt DateTime @default(now())
}
```
(Relations/`@relation` attributes omitted for readability; they will be in the real schema.)

---

## 7. REST API

All responses are JSON. Errors: `{ error: { code, message, details? } }`.

### Public
| Method | Path | Notes |
|---|---|---|
| GET | `/api/health` | |
| GET | `/api/elections?phase=open\|upcoming\|past&org=slug` | Published elections only |
| GET | `/api/elections/:id` | Details, positions, candidates; includes `myStatus` (eligible / voted) when signed in |
| GET | `/api/elections/:id/results` | Respects visibility + release settings |
| GET | `/api/organizations` · `/api/organizations/:slug` | |
| GET | `/api/announcements` | |
| POST | `/api/contact` | Rate-limited |

### Auth
| Method | Path | Notes |
|---|---|---|
| GET | `/api/auth/me` | Current user or 401 |
| POST | `/api/auth/logout` | |
| GET | `/api/auth/dev/users` | **Dev mode only** — list of users to sign in as |
| POST | `/api/auth/dev/login` | **Dev mode only** — `{ username }` |

The server **refuses to start** with `AUTH_MODE=dev` when `NODE_ENV=production`.

### Student (signed in)
| Method | Path | Notes |
|---|---|---|
| GET | `/api/me` | Profile + participation list (election, votedAt — no choices) |
| GET | `/api/elections/:id/ballot` | Only positions this voter is eligible for |
| POST | `/api/elections/:id/vote` | Submits ballot → `{ receiptCode }` |

### Admin
| Method | Path | Permission |
|---|---|---|
| GET/POST | `/api/admin/organizations` | Platform admin |
| PATCH/DELETE | `/api/admin/organizations/:id` | Platform admin |
| GET/POST/DELETE | `/api/admin/organizations/:id/roles` | Platform admin / org admin |
| GET/POST | `/api/admin/elections` | Org election admin |
| GET/PATCH/DELETE | `/api/admin/elections/:id` | Org election admin (DELETE = drafts only) |
| POST | `/api/admin/elections/:id/publish` · `/close` · `/cancel` · `/publish-results` | Org election admin |
| POST/PATCH/DELETE | `/api/admin/elections/:id/positions[/:positionId]` | Locked once open |
| POST/PATCH/DELETE | `/api/admin/positions/:positionId/candidates[/:candidateId]` | Locked once open |
| GET | `/api/admin/elections/:id/stats` | Turnout overall & by class — never selections |
| GET/POST/PUT | `/api/admin/voter-lists[/:id]` | Org election admin |
| GET | `/api/admin/students?search=&class=&page=` | Platform admin |
| PATCH | `/api/admin/students/:id` | Platform admin (audited) |
| POST | `/api/admin/imports?dryRun=true\|false&mode=MERGE\|FULL_SYNC` | Platform admin |
| GET | `/api/admin/imports[/:id]` | Platform admin |
| GET/POST/PATCH/DELETE | `/api/admin/announcements[/:id]` | Org/platform admin |
| GET | `/api/admin/audit-logs` | Platform admin |
| GET/PATCH | `/api/admin/contact-messages[/:id]` | Platform admin |

---

## 8. Frontend pages

**Public / student**
| Route | Page |
|---|---|
| `/` | Home — hero with ASA branding, open / upcoming / recent results, announcements |
| `/elections` | Elections with tabs **Active · Upcoming · Past** (`?tab=`) |
| `/elections/:id` | Election detail, positions & candidate cards, eligibility badge, "Vote" button |
| `/elections/:id/vote` | Ballot (only eligible positions) → review step → confirm dialog |
| `/elections/:id/confirmation` | Receipt code |
| `/elections/:id/results` | Results & turnout |
| `/profile` | Name, email, class, roster status, eligibility, participation history |
| `/login` | Dev "sign in as" picker (replaced by real login later) |
| `/about` · `/contact` | About the platform & ASA · contact info + form |
| `*` | Not found |

**Admin** (`/admin`, sidebar layout)
Dashboard · Elections (list, editor with tabs: Details / Positions & Candidates / Eligibility / Results settings) · Election stats · Students & Import · Voter lists · Organizations & admins · Announcements · Messages · Audit log

**UI kit** (`client/src/components/ui`): Button, Card, Badge, Tabs, Table, Modal/ConfirmDialog, Input/Select/Textarea, Spinner, EmptyState, ErrorState, Toast, PageHeader.

**Theme**: Augustana blue & gold as Tailwind tokens (`augie-blue`, `augie-gold`, neutrals). See §10 for values. Serif headings + clean sans-serif body; subtle hover/focus transitions; WCAG AA contrast and visible focus rings.

---

## 9. Folder structure

```
ASA/
├─ client/
│  └─ src/
│     ├─ api/            # one module per resource (elections.ts, admin/imports.ts …)
│     ├─ components/
│     │  ├─ ui/          # generic building blocks
│     │  ├─ layout/      # Navbar, Footer, AdminLayout
│     │  ├─ elections/   # ElectionCard, PositionBallot, CandidateCard …
│     │  └─ admin/
│     ├─ hooks/          # useAuth, useElections, useBallot, useAsync …
│     ├─ pages/          # one file per route, admin/ subfolder
│     ├─ routes/         # router + ProtectedRoute / AdminRoute
│     ├─ context/        # AuthContext
│     └─ utils/
├─ server/
│  ├─ prisma/            # schema.prisma, migrations/, seed.ts (fake data only)
│  └─ src/
│     ├─ config/         # env loading (zod-validated)
│     ├─ routes/  controllers/  services/  middleware/  validators/
│     ├─ services/eligibility/   # isEligible + rule schemas
│     ├─ services/import/        # roster parser + importer
│     ├─ utils/          # AppError, electionPhase, crypto helpers
│     ├─ app.ts  server.ts
│     └─ tests/
├─ shared/               # TS types & zod schemas used by both sides
├─ docs/                 # this file, API.md, SECURITY.md, IMPORT.md, DEPLOYMENT.md, apache.conf.example
├─ .env.example
└─ package.json          # npm workspaces: client, server, shared
```

---

## 10. Resolved decisions (confirmed by project owner)

1. **Class codes** — `FF` and `FR` → Freshman; `SO`, `JR`, `SR` map directly; `GS` (and `GR`) → **Graduate** (`GR`). Other codes are treated as invalid. ASA class senator seats use the four undergraduate classes; graduate students can be targeted explicitly in eligibility rules.
2. **Invalid/missing class code** — student is imported with no class (eligible only for "all students" / voter-list positions) and a warning is listed.
3. **Email local-part ≠ username** — accepted, no warning (emails may legitimately differ from usernames).
4. **Full sync** — students absent from the file are marked `onRoster = false`; never deleted.
5. **Branding** — Augustana blue & gold. Tokens: `augie-blue` `#003087` (navy, primary), `augie-gold` `#FFC72C` (accent). ASA logo assets in `client/public/brand/`:
   - `asa-logo.png` — transparent background, original colors (use on light backgrounds)
   - `asa-logo-light.png` — white/gold recolor (use on navy backgrounds)

## 11. Subagents & workflow

| Phase | Agent (owns) |
|---|---|
| All | **Architect / Git** — this main session: plans, assigns, reviews, branches, commits |
| Foundation, features | **Backend + Database** — `server/`, `shared/` |
| Foundation, features | **UI / Frontend** — `client/` (works against this API contract) |
| After auth & voting | **Security reviewer** — read-only review, reports findings |
| Each feature | **Tester** — `server/src/tests`, client tests |
| End of each phase | **Documentation** — `docs/` |

Agents never edit the same folder concurrently. Every feature lands on its own branch; **nothing merges into `main` without your approval.**

## 12. Roadmap

1. `feature/foundation` — workspaces, Express skeleton, Prisma schema + migration, Tailwind theme, UI kit, layout, dev auth.
2. `feature/student-import` — parser, dry run, import UI, tests against the sample format.
3. `feature/organizations-roles` — orgs, admin roles, RBAC middleware.
4. `feature/election-management` — elections, positions, candidates, eligibility editor, voter lists.
5. `feature/voting` — ballot, transactional submission, receipts, privacy tests.
6. `feature/results` — tallying, visibility/release rules, stats.
7. `feature/public-pages` — home, about, contact, announcements.
8. Testing & security review → docs → `deploy/` (systemd unit, Apache vhost example).

Real login (SSO or email code) and hosting are scheduled once you decide on them.
