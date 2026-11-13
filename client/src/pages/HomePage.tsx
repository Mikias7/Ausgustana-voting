import type { ReactNode } from "react";
import { ArrowRight, Lock, Megaphone, ShieldCheck, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { ElectionGrid } from "../components/elections/ElectionGrid";
import { BRAND } from "../components/layout/brand";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Container } from "../components/ui/Container";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { Skeleton } from "../components/ui/Skeleton";
import { useAuth } from "../context/AuthContext";
import { useAnnouncements } from "../hooks/useAnnouncements";
import { useElections } from "../hooks/useElections";
import { usePageTitle } from "../hooks/usePageTitle";
import { formatDate, toIso } from "../utils/dates";

interface SectionProps {
  id: string;
  title: string;
  description?: string;
  link?: { to: string; label: string };
  children: ReactNode;
}

function Section({ id, title, description, link, children }: SectionProps) {
  return (
    <section aria-labelledby={id} className="py-10 sm:py-12">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id={id} className="text-2xl font-semibold sm:text-3xl">
            {title}
          </h2>
          {description && <p className="mt-1.5 text-slate-600">{description}</p>}
        </div>
        {link && (
          <Link
            to={link.to}
            className="inline-flex items-center gap-1 rounded-sm text-sm font-semibold text-augie-blue-700 hover:text-augie-blue-900"
          >
            {link.label} <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function Hero() {
  const { user } = useAuth();
  return (
    <section className="on-dark relative overflow-hidden bg-augie-blue text-white">
      {/* Decorative background: soft radial glow + faint grid */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,199,44,0.16),transparent_55%),radial-gradient(ellipse_at_bottom_left,rgba(43,86,173,0.6),transparent_60%)]"
      />
      <Container className="relative grid items-center gap-10 py-16 sm:py-20 lg:grid-cols-[1fr_auto] lg:py-24">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold tracking-[0.18em] text-augie-gold uppercase">{BRAND.orgName}</p>
          <div className="mt-4 h-1 w-16 rounded-full bg-augie-gold" aria-hidden="true" />
          <h1 className="mt-6 text-4xl leading-[1.1] font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Your voice in student government
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-augie-blue-100">
            Vote in ASA and student organization elections at Augustana University — securely, privately, and in
            just a few minutes.
            {user && (
              <>
                {" "}
                Welcome back, <span className="font-semibold text-white">{user.firstName}</span>.
              </>
            )}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button to="/elections" variant="gold" size="lg" rightIcon={<ArrowRight className="size-5" aria-hidden="true" />}>
              View active elections
            </Button>
            <Button to="/about" variant="outline-light" size="lg">
              How voting works
            </Button>
          </div>
          <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm text-augie-blue-100">
            <li className="flex items-center gap-2">
              <Lock className="size-4 text-augie-gold" aria-hidden="true" /> Secret ballot
            </li>
            <li className="flex items-center gap-2">
              <Users className="size-4 text-augie-gold" aria-hidden="true" /> Class-based eligibility
            </li>
            <li className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-augie-gold" aria-hidden="true" /> One vote per student
            </li>
          </ul>
        </div>
        <div className="hidden lg:block">
          <div className="relative flex size-72 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10">
            <div className="absolute inset-4 rounded-full ring-1 ring-augie-gold/30" aria-hidden="true" />
            <img src={BRAND.logoLight} alt={`${BRAND.orgName} logo`} className="size-52" width={208} height={208} />
          </div>
        </div>
      </Container>
      <div className="h-1 bg-linear-to-r from-transparent via-augie-gold to-transparent opacity-70" aria-hidden="true" />
    </section>
  );
}

function Announcements() {
  const { data, loading, error, reload } = useAnnouncements();

  if (loading && !data) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <span className="sr-only" role="status">
          Loading announcements…
        </span>
        {[0, 1].map((i) => (
          <Card key={i} className="space-y-3">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-full" />
          </Card>
        ))}
      </div>
    );
  }
  if (error) return <ErrorState compact title="We couldn't load announcements" error={error} onRetry={reload} />;
  if (!data || data.length === 0) {
    return (
      <EmptyState
        compact
        icon={<Megaphone className="size-6" aria-hidden="true" />}
        title="No announcements right now"
        description="News from ASA and student organizations will appear here."
      />
    );
  }
  return (
    <ul className="grid gap-4 md:grid-cols-2">
      {data.slice(0, 4).map((a) => (
        <li key={a.id}>
          <Card as="article" className="h-full border-l-4 border-l-augie-gold">
            <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
              <time dateTime={toIso(a.publishedAt)}>{formatDate(a.publishedAt)}</time>
              {a.organizationName && <> · {a.organizationName}</>}
            </p>
            <h3 className="mt-2 text-lg font-semibold">{a.title}</h3>
            <p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-slate-600">{a.body}</p>
          </Card>
        </li>
      ))}
    </ul>
  );
}

export function HomePage() {
  usePageTitle(null);
  const open = useElections("open");
  const upcoming = useElections("upcoming");
  const past = useElections("past");

  return (
    <>
      <Hero />
      <div className="bg-white">
        <Container>
          <Section
            id="active-heading"
            title="Active now"
            description="Elections you can vote in today."
            link={{ to: "/elections", label: "All active elections" }}
          >
            <ElectionGrid
              elections={open.data}
              loading={open.loading}
              error={open.error}
              onRetry={open.reload}
              limit={3}
              compact
              emptyTitle="No elections are open right now"
              emptyDescription="Check the upcoming elections below — we'll list them here as soon as voting opens."
            />
          </Section>
        </Container>
      </div>
      <Container>
        <Section
          id="upcoming-heading"
          title="Upcoming"
          description="Mark your calendar."
          link={{ to: "/elections?tab=upcoming", label: "All upcoming" }}
        >
          <ElectionGrid
            elections={upcoming.data}
            loading={upcoming.loading}
            error={upcoming.error}
            onRetry={upcoming.reload}
            limit={3}
            compact
            emptyTitle="Nothing scheduled yet"
            emptyDescription="New elections are announced by ASA and student organizations throughout the year."
          />
        </Section>
        <Section
          id="results-heading"
          title="Recent results"
          description="Closed elections and published results."
          link={{ to: "/elections?tab=past", label: "All past elections" }}
        >
          <ElectionGrid
            elections={past.data}
            loading={past.loading}
            error={past.error}
            onRetry={past.reload}
            limit={3}
            compact
            emptyTitle="No past elections yet"
            emptyDescription="Results appear here once elections close and results are released."
          />
        </Section>
        <Section id="announcements-heading" title="Announcements">
          <Announcements />
        </Section>
      </Container>
    </>
  );
}
