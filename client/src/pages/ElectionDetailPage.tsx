import type { ReactNode } from "react";
import type { ElectionDetail } from "@asa/shared";
import { ArrowLeft, Ban, CalendarClock, ChartColumn, CircleCheck, Clock, Info, LogIn, Vote } from "lucide-react";
import { Link, useLocation, useParams } from "react-router-dom";
import { isApiError } from "../api/client";
import { EligibilityBadge } from "../components/elections/EligibilityBadge";
import { PhaseBadge } from "../components/elections/PhaseBadge";
import { PositionSection } from "../components/elections/PositionSection";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Container } from "../components/ui/Container";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { Skeleton } from "../components/ui/Skeleton";
import { useAuth } from "../context/AuthContext";
import { useElection } from "../hooks/useElection";
import { usePageTitle } from "../hooks/usePageTitle";
import { loginPath } from "../utils/auth";
import { formatDateTime, toIso } from "../utils/dates";
import { describeEligibilityRule } from "../utils/labels";

function BackLink() {
  return (
    <Link
      to="/elections"
      className="inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-augie-blue-100 hover:text-white"
    >
      <ArrowLeft className="size-4" aria-hidden="true" /> All elections
    </Link>
  );
}

interface ActionState {
  icon: ReactNode;
  title: string;
  body?: ReactNode;
  action?: ReactNode;
  tone: "primary" | "success" | "muted";
}

/** The ballot box card: what this visitor can do with the election right now. */
function useActionState(election: ElectionDetail): ActionState {
  const { user } = useAuth();
  const location = useLocation();
  const { phase, myStatus } = election;
  const iconClass = "size-6";

  if (phase === "cancelled") {
    return { tone: "muted", icon: <Ban className={iconClass} aria-hidden="true" />, title: "This election was cancelled" };
  }
  if (phase === "upcoming" || phase === "draft") {
    return {
      tone: "muted",
      icon: <CalendarClock className={iconClass} aria-hidden="true" />,
      title: `Opens ${formatDateTime(election.startsAt)}`,
      body: myStatus
        ? myStatus.eligible
          ? "You're eligible. Come back when voting opens."
          : (myStatus.reason ?? "You aren't eligible to vote in this election.")
        : "Sign in when voting opens to cast your ballot.",
    };
  }
  if (phase === "closed") {
    return election.resultsAvailable
      ? {
          tone: "primary",
          icon: <ChartColumn className={iconClass} aria-hidden="true" />,
          title: "Voting has closed",
          body: "Results for this election are available.",
          action: (
            <Button to={`/elections/${election.id}/results`} fullWidth size="lg">
              View results
            </Button>
          ),
        }
      : {
          tone: "muted",
          icon: <Clock className={iconClass} aria-hidden="true" />,
          title: "Voting has closed",
          body: "Results haven't been released yet.",
        };
  }

  // phase === "open"
  if (!user || !myStatus) {
    return {
      tone: "primary",
      icon: <LogIn className={iconClass} aria-hidden="true" />,
      title: "Voting is open",
      body: "Sign in with your Augustana account to check your eligibility and vote.",
      action: (
        <Button to={loginPath(location.pathname)} fullWidth size="lg">
          Sign in to vote
        </Button>
      ),
    };
  }
  if (myStatus.hasVoted) {
    return {
      tone: "success",
      icon: <CircleCheck className={iconClass} aria-hidden="true" />,
      title: "You've already voted",
      body: "Your ballot has been recorded. Thank you for participating!",
    };
  }
  if (!myStatus.eligible) {
    return {
      tone: "muted",
      icon: <Ban className={iconClass} aria-hidden="true" />,
      title: "You're not eligible for this election",
      body: myStatus.reason ?? undefined,
    };
  }
  return {
    tone: "primary",
    icon: <Vote className={iconClass} aria-hidden="true" />,
    title: "Your ballot is ready",
    body: `Voting closes ${formatDateTime(election.endsAt)}.`,
    action: (
      <Button to={`/elections/${election.id}/vote`} fullWidth size="lg" variant="gold">
        Vote now
      </Button>
    ),
  };
}

const toneClasses: Record<ActionState["tone"], string> = {
  primary: "bg-augie-blue-50 text-augie-blue",
  success: "bg-emerald-50 text-emerald-700",
  muted: "bg-slate-100 text-slate-500",
};

function ActionCard({ election }: { election: ElectionDetail }) {
  const state = useActionState(election);
  return (
    <Card className="lg:sticky lg:top-28">
      <div className={`mb-4 flex size-12 items-center justify-center rounded-full ${toneClasses[state.tone]}`}>
        {state.icon}
      </div>
      <h2 className="text-xl font-semibold">{state.title}</h2>
      {state.body && <p className="mt-2 text-sm leading-relaxed text-slate-600">{state.body}</p>}
      {state.action && <div className="mt-5">{state.action}</div>}

      <dl className="mt-6 space-y-3 border-t border-slate-100 pt-5 text-sm">
        <div>
          <dt className="font-medium text-slate-500">Opens</dt>
          <dd className="text-slate-900">
            <time dateTime={toIso(election.startsAt)}>{formatDateTime(election.startsAt)}</time>
          </dd>
        </div>
        <div>
          <dt className="font-medium text-slate-500">Closes</dt>
          <dd className="text-slate-900">
            <time dateTime={toIso(election.endsAt)}>{formatDateTime(election.endsAt)}</time>
          </dd>
        </div>
      </dl>
    </Card>
  );
}

function DetailSkeleton() {
  return (
    <>
      <div className="bg-augie-blue">
        <Container className="space-y-4 py-12">
          <Skeleton className="h-4 w-28 bg-white/20" />
          <Skeleton className="h-10 w-2/3 bg-white/20" />
          <Skeleton className="h-4 w-1/2 bg-white/20" />
        </Container>
      </div>
      <Container className="grid gap-8 py-10 lg:grid-cols-[1fr_20rem]">
        <span className="sr-only" role="status">
          Loading election…
        </span>
        <div className="space-y-6">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-56 w-full rounded-2xl" />
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </Container>
    </>
  );
}

export function ElectionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: election, loading, error, reload } = useElection(id);
  usePageTitle(election?.title ?? "Election");

  if (loading && !election) return <DetailSkeleton />;

  if (error || !election) {
    const notFound = isApiError(error, 404) || !error;
    return (
      <Container size="md" className="py-16">
        {notFound ? (
          <EmptyState
            title="Election not found"
            description="This election doesn't exist or isn't published yet."
            action={
              <Button to="/elections" variant="secondary">
                Browse elections
              </Button>
            }
          />
        ) : (
          <ErrorState title="We couldn't load this election" error={error} onRetry={reload} />
        )}
      </Container>
    );
  }

  const myStatus = election.myStatus;
  const eligibleIds = new Set(myStatus?.eligiblePositionIds ?? []);

  return (
    <>
      <section className="on-dark bg-augie-blue text-white">
        <Container className="py-10 sm:py-14">
          <BackLink />
          <p className="mt-6 text-sm font-semibold tracking-[0.14em] text-augie-gold uppercase">
            {election.organization.name}
          </p>
          <h1 className="mt-2 max-w-3xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            {election.title}
          </h1>
          <div className="mt-4 flex flex-wrap gap-2">
            <PhaseBadge phase={election.phase} />
            <EligibilityBadge myStatus={myStatus} phase={election.phase} rule={election.eligibility} />
          </div>
        </Container>
        <div className="h-1 bg-augie-gold" aria-hidden="true" />
      </section>

      <Container className="grid gap-8 py-10 lg:grid-cols-[1fr_20rem] lg:gap-10">
        <div className="min-w-0 space-y-8">
          {election.description && (
            <section aria-labelledby="about-election">
              <h2 id="about-election" className="text-2xl font-semibold">
                About this election
              </h2>
              <p className="mt-3 leading-relaxed whitespace-pre-line text-slate-700">{election.description}</p>
            </section>
          )}

          <section aria-labelledby="eligibility-heading" className="rounded-xl border border-augie-blue-100 bg-augie-blue-50/60 p-5">
            <h2 id="eligibility-heading" className="flex items-center gap-2 font-sans text-base font-semibold text-augie-blue-900">
              <Info className="size-5 text-augie-blue-600" aria-hidden="true" /> Who can vote
            </h2>
            <p className="mt-2 text-sm text-slate-700">{describeEligibilityRule(election.eligibility)}.</p>
            {myStatus && (
              <p className="mt-2 text-sm text-slate-700">
                {myStatus.eligible ? (
                  <>
                    <span className="font-semibold text-augie-blue-900">You're eligible</span>
                    {myStatus.eligiblePositionIds.length > 0 &&
                      ` for ${myStatus.eligiblePositionIds.length} of ${election.positions.length} position${election.positions.length === 1 ? "" : "s"}.`}
                  </>
                ) : (
                  <>
                    <span className="font-semibold text-slate-900">You're not eligible.</span>{" "}
                    {myStatus.reason}
                  </>
                )}
              </p>
            )}
            <p className="mt-2 text-xs text-slate-500">
              Some positions are limited to a class year. You'll only see the positions you can vote for on your
              ballot. <Link to="/about" className="font-medium text-augie-blue-700 underline">How eligibility works</Link>
            </p>
          </section>

          <section aria-labelledby="positions-heading">
            <h2 id="positions-heading" className="text-2xl font-semibold">
              Positions &amp; candidates
            </h2>
            {election.positions.length === 0 ? (
              <EmptyState compact className="mt-4" title="No positions listed yet" description="Check back closer to the election." />
            ) : (
              <div className="mt-4 space-y-6">
                {election.positions.map((position) => (
                  <PositionSection
                    key={position.id}
                    position={position}
                    canVote={myStatus && election.phase === "open" && !myStatus.hasVoted ? eligibleIds.has(position.id) : undefined}
                  />
                ))}
              </div>
            )}
          </section>
        </div>

        <aside aria-label="Voting status">
          <ActionCard election={election} />
        </aside>
      </Container>
    </>
  );
}
