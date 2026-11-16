import { ChartColumn, ChevronLeft, LogIn } from "lucide-react";
import { Link, useLocation, useParams } from "react-router-dom";
import { getResults } from "../api/elections";
import { isApiError } from "../api/client";
import { ResultsView } from "../components/results/ResultsView";
import { Alert } from "../components/ui/Alert";
import { Button } from "../components/ui/Button";
import { Container } from "../components/ui/Container";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { PageHeader } from "../components/ui/PageHeader";
import { Skeleton } from "../components/ui/Skeleton";
import { useAuth } from "../context/AuthContext";
import { useAsync } from "../hooks/useAsync";
import { usePageTitle } from "../hooks/usePageTitle";
import { loginPath } from "../utils/auth";
import { formatDateTime } from "../utils/dates";

function ResultsSkeleton() {
  return (
    <div aria-busy="true" className="space-y-6">
      <span className="sr-only" role="status">
        Loading results…
      </span>
      <Skeleton className="h-24 w-full rounded-panel" />
      <Skeleton className="h-56 w-full rounded-panel" />
    </div>
  );
}

/** /elections/:id/results: totals per position, winners and (when shown) turnout. */
export function ResultsPage() {
  const { id = "" } = useParams<{ id: string }>();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { data: results, error, loading, reload } = useAsync((signal) => getResults(id, signal), [id, user?.id], {
    enabled: Boolean(id) && !authLoading,
  });
  usePageTitle(results ? `Results · ${results.title}` : "Results");

  const back = (
    <Link
      to={`/elections/${encodeURIComponent(id)}`}
      className="-ml-2 inline-flex min-h-11 items-center gap-0.5 rounded-full pr-3 pl-1 text-callout font-medium text-navy-900 transition-colors duration-160 hover:text-navy-600"
    >
      <ChevronLeft className="size-[18px]" aria-hidden="true" /> Election
    </Link>
  );

  let body;
  if (results) {
    body = (
      <>
        {!results.released && (
          <Alert tone="info" title="Preview for organizers" className="mb-6">
            Students can't see these results yet. Release them from the election's Results tab in Admin.
          </Alert>
        )}
        <ResultsView results={results} />
      </>
    );
  } else if (loading || authLoading) {
    body = <ResultsSkeleton />;
  } else if (isApiError(error, 401)) {
    body = (
      <EmptyState
        icon={<LogIn aria-hidden="true" />}
        title="Sign in to see results"
        description="Results for this election are shared with Augustana students."
        action={<Button to={loginPath(location.pathname)}>Sign in</Button>}
      />
    );
  } else if (isApiError(error, 403)) {
    body = (
      <EmptyState
        icon={<ChartColumn aria-hidden="true" />}
        title="Results aren't available"
        description={error.message}
        action={
          <Button to={`/elections/${encodeURIComponent(id)}`} variant="tinted">
            View election details
          </Button>
        }
      />
    );
  } else if (isApiError(error, 404)) {
    body = <ErrorState title="Election not found" message="It may have been removed, or the link is wrong." />;
  } else {
    body = <ErrorState title="We couldn't load the results" error={error} onRetry={reload} />;
  }

  return (
    <Container size="narrow">
      <PageHeader
        breadcrumb={back}
        eyebrow={results?.title ?? "Election"}
        title="Results"
        description={
          results ? (
            <>
              {results.organizationName} · Voting closed{" "}
              <time dateTime={results.closedAt}>{formatDateTime(results.closedAt)}</time>
            </>
          ) : undefined
        }
      />
      {body}
    </Container>
  );
}
