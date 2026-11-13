import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { BallotIssue, ElectionDetail } from "@asa/shared";
import { ChevronLeft, CircleCheck, Lock, Vote } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getErrorMessage, isApiError } from "../api/client";
import { submitVote } from "../api/elections";
import { BallotPosition } from "../components/voting/BallotPosition";
import { BallotReview } from "../components/voting/BallotReview";
import { Alert } from "../components/ui/Alert";
import { Button } from "../components/ui/Button";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { Container } from "../components/ui/Container";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { LoadingState } from "../components/ui/LoadingState";
import { PageHeader } from "../components/ui/PageHeader";
import { useElection } from "../hooks/useElection";
import { usePageTitle } from "../hooks/usePageTitle";
import { isComplete, toSubmission, type BallotDraft } from "../utils/ballot";
import { formatDateTime } from "../utils/dates";

/** Navigation state handed to the confirmation page (kept in memory only). */
export interface ConfirmationState {
  receiptCode: string;
  electionTitle: string;
}

function BackToElection({ id }: { id: string }) {
  return (
    <Link
      to={`/elections/${id}`}
      className="-ml-2 inline-flex min-h-11 items-center gap-0.5 rounded-full pr-3 pl-1 text-callout font-medium text-navy-900 transition-colors duration-160 hover:text-navy-600"
    >
      <ChevronLeft className="size-[18px]" aria-hidden="true" /> Election
    </Link>
  );
}

function Blocked({ id, title, description, icon }: { id: string; title: string; description: ReactNode; icon: ReactNode }) {
  return (
    <Container size="narrow">
      <BackToElection id={id} />
      <EmptyState
        icon={icon}
        title={title}
        description={description}
        action={
          <Button to={`/elections/${id}`} variant="secondary">
            Back to the election
          </Button>
        }
      />
    </Container>
  );
}

function issuesByPosition(issues: BallotIssue[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of issues) if (i.positionId && !out[i.positionId]) out[i.positionId] = i.message;
  return out;
}

function Ballot({ election }: { election: ElectionDetail }) {
  const navigate = useNavigate();
  const eligibleIds = election.myStatus?.eligiblePositionIds ?? [];
  const positions = useMemo(
    () => election.positions.filter((p) => eligibleIds.includes(p.id)),
    [election],
  );

  const [draft, setDraft] = useState<BallotDraft>({});
  const [step, setStep] = useState<"ballot" | "review">("ballot");
  const [showProblems, setShowProblems] = useState(false);
  const [serverIssues, setServerIssues] = useState<Record<string, string>>({});
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<{ message: string; final: boolean } | null>(null);

  const done = positions.filter((p) => isComplete(p, draft[p.id])).length;
  const dirty = Object.keys(draft).length > 0;

  // Warn before closing the tab with an unsubmitted ballot. Choices are never saved anywhere.
  useEffect(() => {
    if (!dirty || submitting) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty, submitting]);

  // On step change: jump to the position being edited, or to the top.
  const [scrollTarget, setScrollTarget] = useState<string | null>(null);
  useEffect(() => {
    const el = scrollTarget ? document.getElementById(`position-${scrollTarget}`) : null;
    if (el) el.scrollIntoView({ block: "start" });
    else window.scrollTo({ top: 0 });
    setScrollTarget(null);
  }, [step]);

  function edit(positionId?: string) {
    setScrollTarget(positionId ?? null);
    setStep("ballot");
  }

  function review() {
    const firstIncomplete = positions.find((p) => !isComplete(p, draft[p.id]));
    if (firstIncomplete) {
      setShowProblems(true);
      document.getElementById(`position-${firstIncomplete.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    setStep("review");
  }

  async function submit() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const { receiptCode } = await submitVote(election.id, toSubmission(positions, draft));
      const state: ConfirmationState = { receiptCode, electionTitle: election.title };
      navigate(`/elections/${election.id}/confirmation`, { replace: true, state });
    } catch (err) {
      setSubmitting(false);
      setConfirming(false);
      if (isApiError(err) && err.code === "INVALID_BALLOT") {
        const details = err.details as { issues?: BallotIssue[] } | undefined;
        setServerIssues(issuesByPosition(details?.issues ?? []));
        setShowProblems(true);
        setStep("ballot");
        setSubmitError({ message: getErrorMessage(err), final: false });
        return;
      }
      const final =
        isApiError(err) && ["ALREADY_VOTED", "ELECTION_NOT_OPEN", "NOT_ELIGIBLE", "NOT_FOUND"].includes(err.code);
      setSubmitError({ message: getErrorMessage(err), final });
    }
  }

  const header = (
    <PageHeader
      breadcrumb={<BackToElection id={election.id} />}
      eyebrow={election.title}
      title={step === "ballot" ? "Your ballot" : "Review your ballot"}
      description={
        step === "ballot"
          ? `Only positions you're eligible for are shown. Voting closes ${formatDateTime(election.endsAt)}.`
          : "Check your choices. Once you submit, your ballot can't be changed."
      }
    />
  );

  return (
    <>
      <Container size="reading">
        {header}

        {submitError && (
          <Alert tone="error" title="Your ballot wasn't submitted" className="mb-6">
            {submitError.message}
            {submitError.final && (
              <span className="mt-2 block">
                <Link to={`/elections/${election.id}`} className="font-medium text-navy-900 underline underline-offset-2">
                  Back to the election
                </Link>
              </span>
            )}
          </Alert>
        )}

        {step === "ballot" ? (
          <div className="space-y-5">
            {positions.map((p) => (
              <BallotPosition
                key={p.id}
                position={p}
                choice={draft[p.id]}
                showProblem={showProblems}
                serverIssue={serverIssues[p.id]}
                onChange={(choice) => {
                  setDraft((d) => ({ ...d, [p.id]: choice }));
                  setServerIssues(({ [p.id]: _cleared, ...rest }) => rest);
                }}
              />
            ))}
          </div>
        ) : (
          <BallotReview positions={positions} draft={draft} onEdit={edit} />
        )}

        <p className="mt-6 flex items-start gap-2 text-footnote font-normal text-ink-2">
          <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          Your choices are stored separately from your name. We record that you voted, never how.
        </p>
        {/* Sticky (not fixed): follows the viewport while reading, then rests above the footer. */}
        <div className="sticky bottom-[calc(var(--tabbar-space)+8px)] z-30 mt-8 md:bottom-[max(16px,env(safe-area-inset-bottom))]">
          <div className="glass flex items-center gap-3 rounded-panel border border-hairline py-2 pr-2 pl-5 shadow-float">
            {step === "ballot" ? (
              <>
                <p className="min-w-0 flex-1 text-callout text-ink-2 tabular" aria-live="polite">
                  <span className="font-semibold text-ink">{done}</span> of {positions.length} complete
                </p>
                <Button onClick={review} className="shrink-0">
                  Review ballot
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" onClick={() => edit()} className="shrink-0">
                  Edit
                </Button>
                <span className="flex-1" />
                <Button
                  variant="gold"
                  onClick={() => setConfirming(true)}
                  disabled={submitError?.final}
                  leftIcon={<Vote className="size-4" aria-hidden="true" />}
                  className="shrink-0"
                >
                  Submit ballot
                </Button>
              </>
            )}
          </div>
        </div>
      </Container>

      <ConfirmDialog
        open={confirming}
        title="Submit your ballot?"
        description="You can only vote once. After you submit, your choices can't be changed."
        confirmLabel="Submit ballot"
        cancelLabel="Keep reviewing"
        loading={submitting}
        onConfirm={submit}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}

/** /elections/:id/vote — ballot → review → confirm → receipt. */
export function VotePage() {
  const { id = "" } = useParams<{ id: string }>();
  const { data: election, loading, error, reload } = useElection(id);
  usePageTitle(election ? `Vote · ${election.title}` : "Vote");

  if (loading && !election) return <LoadingState label="Loading your ballot…" />;
  if (error || !election) {
    return (
      <Container size="narrow">
        {isApiError(error, 404) || !error ? (
          <EmptyState title="Election not found" description="This election doesn't exist or isn't published yet." />
        ) : (
          <ErrorState title="We couldn't load your ballot" error={error} onRetry={reload} />
        )}
      </Container>
    );
  }

  const { myStatus } = election;
  if (election.phase !== "open") {
    const description =
      election.phase === "upcoming"
        ? `Voting opens ${formatDateTime(election.startsAt)}.`
        : election.phase === "cancelled"
          ? "This election was cancelled."
          : "Voting for this election has closed.";
    return <Blocked id={id} title="Voting isn't open" description={description} icon={<Lock aria-hidden="true" />} />;
  }
  if (myStatus?.hasVoted) {
    return (
      <Blocked
        id={id}
        title="You've already voted"
        description={
          <>
            Your ballot has been recorded. You can confirm it with your receipt code on the{" "}
            <Link to="/receipt" className="font-medium text-navy-900 underline underline-offset-2">
              receipt check page
            </Link>
            .
          </>
        }
        icon={<CircleCheck aria-hidden="true" />}
      />
    );
  }
  if (!myStatus?.eligible) {
    return (
      <Blocked
        id={id}
        title="You're not eligible for this election"
        description={myStatus?.reason ?? "Only eligible students can vote in this election."}
        icon={<Lock aria-hidden="true" />}
      />
    );
  }

  return <Ballot election={election} />;
}
