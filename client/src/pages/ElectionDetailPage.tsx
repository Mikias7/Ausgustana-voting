import type { ElectionDetail } from "@asa/shared";
import { ChevronLeft, Info } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { isApiError } from "../api/client";
import { ElectionActionBar } from "../components/elections/ElectionActionBar";
import { ElectionActionPanel } from "../components/elections/ElectionActionPanel";
import { EligibilityChip } from "../components/elections/EligibilityChip";
import { PositionList } from "../components/elections/PositionList";
import { useElectionAction } from "../components/elections/useElectionAction";
import { Button } from "../components/ui/Button";
import { Container } from "../components/ui/Container";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { Skeleton } from "../components/ui/Skeleton";
import { StatusIndicator } from "../components/ui/StatusIndicator";
import { useElection } from "../hooks/useElection";
import { usePageTitle } from "../hooks/usePageTitle";
import { formatDateRange, toIso } from "../utils/dates";
import { describeEligibilityRule } from "../utils/labels";

function BackLink() {
  return (
    <Link
      to="/elections"
      className="-ml-2 inline-flex min-h-11 items-center gap-0.5 rounded-full pr-3 pl-1 text-callout font-medium text-navy-900 transition-colors duration-160 hover:text-navy-600"
    >
      <ChevronLeft className="size-[18px]" aria-hidden="true" /> Elections
    </Link>
  );
}

function DetailSkeleton() {
  return (
    <Container>
      <span className="sr-only" role="status">
        Loading election…
      </span>
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-10 h-3 w-40" />
      <Skeleton className="mt-4 h-10 w-2/3" />
      <Skeleton className="mt-4 h-4 w-1/3" />
      <div className="mt-14 grid gap-12 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-24 w-full rounded-row" />
          <Skeleton className="h-24 w-full rounded-row" />
        </div>
        <Skeleton className="hidden h-72 w-full rounded-panel lg:block" />
      </div>
    </Container>
  );
}

function WhoCanVote({ election }: { election: ElectionDetail }) {
  const { myStatus } = election;
  return (
    <section aria-labelledby="eligibility-heading" className="flex gap-3.5 rounded-row bg-navy-50 px-5 py-4">
      <Info className="mt-0.5 size-[18px] shrink-0 text-navy-900" aria-hidden="true" />
      <div className="min-w-0 text-callout text-ink-2">
        <h2 id="eligibility-heading" className="font-semibold text-ink">
          Who can vote
        </h2>
        <p className="mt-0.5">{describeEligibilityRule(election.eligibility)}.</p>
        {myStatus && (
          <p className="mt-1.5">
            {myStatus.eligible ? (
              <>
                <span className="font-semibold text-ink">You&apos;re eligible</span>
                {myStatus.eligiblePositionIds.length > 0 &&
                  ` for ${myStatus.eligiblePositionIds.length} of ${election.positions.length} position${election.positions.length === 1 ? "" : "s"}.`}
              </>
            ) : (
              <>
                <span className="font-semibold text-ink">You&apos;re not eligible.</span> {myStatus.reason}
              </>
            )}
          </p>
        )}
        <p className="mt-1.5 text-footnote font-normal">
          Some positions are limited to a class year; your ballot shows only the ones you can vote for.{" "}
          <Link to="/about" className="font-medium text-navy-900 underline underline-offset-2">
            How eligibility works
          </Link>
        </p>
      </div>
    </section>
  );
}

function ElectionView({ election }: { election: ElectionDetail }) {
  const action = useElectionAction(election);
  const { myStatus } = election;

  return (
    <>
      <Container>
        <BackLink />
        <header className="mt-8 max-w-[760px]">
          <p className="eyebrow">{election.organization.name}</p>
          <h1 className="mt-3 text-large-title">{election.title}</h1>
          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-footnote text-ink-2">
            <StatusIndicator phase={election.phase} />
            <span aria-hidden="true">·</span>
            <time dateTime={toIso(election.startsAt)} className="font-normal">
              {formatDateRange(election.startsAt, election.endsAt)}
            </time>
            <EligibilityChip myStatus={myStatus} phase={election.phase} className="sm:ml-1" />
          </div>
          {election.description && (
            <p className="mt-6 max-w-[680px] text-body whitespace-pre-line text-ink-2">{election.description}</p>
          )}
        </header>

        <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-16">
          {/* Aside first in the DOM: on narrow screens the status sits above the positions. */}
          <aside aria-label="Voting status" className="lg:col-start-2 lg:row-start-1">
            <div className="lg:sticky lg:top-24">
              <ElectionActionPanel election={election} action={action} />
            </div>
          </aside>

          <div className="min-w-0 space-y-10 lg:col-start-1 lg:row-start-1">
            <WhoCanVote election={election} />

            <section aria-labelledby="positions-heading">
              <h2 id="positions-heading" className="mb-6 text-title-2">
                Positions &amp; candidates
              </h2>
              <PositionList positions={election.positions} myStatus={myStatus} />
            </section>
          </div>
        </div>

        {action.cta && <div aria-hidden="true" className="h-20 lg:hidden" />}
      </Container>
      {/* Outside the animated Container so `position: fixed` is relative to the viewport. */}
      <ElectionActionBar action={action} />
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
      <Container size="narrow">
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

  return <ElectionView election={election} />;
}
