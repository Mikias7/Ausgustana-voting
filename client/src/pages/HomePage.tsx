import type { ReactNode } from "react";
import type { ElectionSummary } from "@asa/shared";
import { ArrowRight, CalendarClock, Megaphone } from "lucide-react";
import { Link } from "react-router-dom";
import { ElectionCard } from "../components/elections/ElectionCard";
import { ElectionList } from "../components/elections/ElectionList";
import { ElectionStats } from "../components/elections/ElectionStats";
import { BRAND } from "../components/layout/brand";
import { BrandRule } from "../components/ui/BrandRule";
import { Button } from "../components/ui/Button";
import { Container } from "../components/ui/Container";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { SectionHeader } from "../components/ui/SectionHeader";
import { Skeleton } from "../components/ui/Skeleton";
import { useAuth } from "../context/AuthContext";
import { useAnnouncements } from "../hooks/useAnnouncements";
import { useElections } from "../hooks/useElections";
import { usePageTitle } from "../hooks/usePageTitle";
import { formatDate, formatShortDateTime, toIso } from "../utils/dates";
import { pickFeaturedElection } from "../utils/elections";

/** Calm placeholder for the hero's right side when nothing is open. */
function NothingOpen({ next, loading }: { next: ElectionSummary | undefined; loading: boolean }) {
  if (loading) return <Skeleton className="h-80 w-full rounded-panel" />;
  return (
    <div className="rounded-panel border border-hairline bg-surface p-6 sm:p-8">
      <span className="flex size-12 items-center justify-center rounded-full bg-navy-50 text-navy-900">
        <CalendarClock className="size-6" strokeWidth={1.5} aria-hidden="true" />
      </span>
      <p className="mt-6 text-title-3">No elections are open right now</p>
      {next ? (
        <p className="mt-1.5 text-callout text-ink-2">
          Next:{" "}
          <Link to={`/elections/${next.id}`} className="font-medium text-navy-900 underline-offset-4 hover:underline">
            {next.title}
          </Link>
          , opening <time dateTime={toIso(next.startsAt)}>{formatShortDateTime(next.startsAt)}</time>.
        </p>
      ) : (
        <p className="mt-1.5 text-callout text-ink-2">New elections are announced throughout the year.</p>
      )}
    </div>
  );
}

interface HeroProps {
  featured?: ElectionSummary;
  next?: ElectionSummary;
  loading: boolean;
  stats: ReactNode;
}

function Hero({ featured, next, loading, stats }: HeroProps) {
  const { user } = useAuth();
  return (
    <section aria-labelledby="hero-heading" className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-16">
      <div className="py-4 lg:py-12">
        <BrandRule size="md" className="mb-4" />
        <p className="eyebrow">{BRAND.orgName}</p>
        <h1 id="hero-heading" className="mt-5 text-display">
          Your voice.
          <br />
          Your{" "}
          <span className="relative isolate inline-block">
            vote
            {/* Gold highlighter stroke behind the lower third of the word; draws in once. */}
            <span
              aria-hidden="true"
              className="absolute inset-x-[-0.06em] bottom-[0.06em] -z-10 h-[0.34em] origin-left -skew-x-8 animate-highlight rounded-[0.12em] bg-gold"
            />
          </span>
          .
        </h1>
        <p className="mt-6 max-w-[34rem] text-[1.125rem] leading-relaxed text-ink-2">
          {user ? `Welcome back, ${user.firstName}. ` : ""}
          Vote in ASA and student organization elections at {BRAND.university} — privately, and in a few minutes.
        </p>
        <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-2 sm:gap-3">
          <Button to="/elections" size="lg">
            View elections
          </Button>
          <Button
            to="/about"
            variant="ghost"
            size="lg"
            className="max-sm:px-0 max-sm:hover:bg-transparent"
            rightIcon={<ArrowRight className="size-4" aria-hidden="true" />}
          >
            How it works
          </Button>
        </div>
        {stats}
      </div>
      <div>
        {featured ? (
          <ElectionCard election={featured} variant="feature" headingLevel="h2" />
        ) : (
          <NothingOpen next={next} loading={loading} />
        )}
      </div>
    </section>
  );
}

function Announcements() {
  const { data, loading, error, reload } = useAnnouncements();

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <span className="sr-only" role="status">
          Loading announcements…
        </span>
        {[0, 1].map((i) => (
          <div key={i} className="grid gap-3 sm:grid-cols-[10rem_1fr]">
            <Skeleton className="h-3 w-24" />
            <div className="space-y-2.5">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }
  if (error) return <ErrorState compact title="We couldn't load announcements" error={error} onRetry={reload} />;
  if (!data || data.length === 0) {
    return (
      <EmptyState
        compact
        icon={<Megaphone aria-hidden="true" />}
        title="No announcements right now"
        description="News from ASA and student organizations will appear here."
      />
    );
  }
  return (
    <ul className="border-t border-hairline">
      {data.slice(0, 4).map((a) => (
        <li key={a.id} className="grid gap-1.5 border-b border-hairline py-6 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-8">
          <p className="text-footnote text-ink-2">
            <time dateTime={toIso(a.publishedAt)}>{formatDate(a.publishedAt)}</time>
          </p>
          <article className="max-w-[680px]">
            <h3 className="text-title-3">{a.title}</h3>
            {a.organizationName && <p className="mt-0.5 text-footnote font-normal text-ink-2">{a.organizationName}</p>}
            <p className="mt-2 text-callout whitespace-pre-line text-ink-2">{a.body}</p>
          </article>
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

  const featured = pickFeaturedElection(open.data);
  const otherOpen = open.data?.filter((e) => e.id !== featured?.id);
  const showOpenList = Boolean(open.error) || (otherOpen?.length ?? 0) > 0;

  return (
    <Container className="space-y-12 md:space-y-16">
      <Hero
        featured={featured}
        next={upcoming.data?.[0]}
        loading={open.loading && !open.data}
        stats={
          <ElectionStats
            openCount={open.data?.length}
            upcomingCount={upcoming.data?.length}
            featured={featured}
            loading={(open.loading && !open.data) || (upcoming.loading && !upcoming.data)}
          />
        }
      />

      {showOpenList && (
        <section aria-labelledby="open-heading">
          <SectionHeader id="open-heading" title="Open now" link={{ to: "/elections", label: "See all", srLabel: "open elections" }} />
          <ElectionList
            label="Open elections"
            elections={otherOpen}
            loading={open.loading}
            error={open.error}
            onRetry={open.reload}
            compact
            emptyTitle="No other elections are open"
          />
        </section>
      )}

      <section aria-labelledby="upcoming-heading">
        <SectionHeader
          id="upcoming-heading"
          title="Coming up"
          link={{ to: "/elections?tab=upcoming", label: "See all", srLabel: "upcoming elections" }}
        />
        <ElectionList
          label="Upcoming elections"
          elections={upcoming.data}
          loading={upcoming.loading}
          error={upcoming.error}
          onRetry={upcoming.reload}
          limit={3}
          compact
          emptyTitle="Nothing scheduled yet"
          emptyDescription="New elections are announced by ASA and student organizations throughout the year."
        />
      </section>

      <section aria-labelledby="results-heading">
        <SectionHeader
          id="results-heading"
          title="Recent results"
          link={{ to: "/elections?tab=past", label: "See all", srLabel: "past elections" }}
        />
        <ElectionList
          label="Recent elections"
          elections={past.data}
          loading={past.loading}
          error={past.error}
          onRetry={past.reload}
          limit={3}
          compact
          emptyTitle="No past elections yet"
          emptyDescription="Results appear here once elections close and results are released."
        />
      </section>

      <section aria-labelledby="announcements-heading">
        <SectionHeader id="announcements-heading" title="Announcements" />
        <Announcements />
      </section>
    </Container>
  );
}
