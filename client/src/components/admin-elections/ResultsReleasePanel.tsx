import { useState } from "react";
import { EyeOff, Send, ShieldAlert } from "lucide-react";
import {
  lowTurnoutPositions,
  RESULTS_PRIVACY_MIN_BALLOTS,
  type AdminElectionDetail,
} from "@asa/shared";
import { getElectionResults, publishResults, unpublishResults } from "../../api/admin/elections";
import { useAsync } from "../../hooks/useAsync";
import { describeAdminError } from "../../utils/adminElections";
import { formatDateTime } from "../../utils/dates";
import { ResultsView } from "../results/ResultsView";
import { Alert } from "../ui/Alert";
import { Button } from "../ui/Button";
import { Checkbox } from "../ui/Checkbox";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { ErrorState } from "../ui/ErrorState";
import { Panel } from "../ui/Panel";
import { Skeleton } from "../ui/Skeleton";
import { PanelTitle } from "./AdminBits";
import type { Notice } from "./PositionsEditor";

const AUDIENCE = {
  PUBLIC: "everyone, including visitors who aren't signed in",
  STUDENTS: "signed-in students",
  ADMINS_ONLY: "organizers only",
} as const;

type Election = Pick<
  AdminElectionDetail,
  "id" | "title" | "resultsRelease" | "resultsVisibility" | "resultsPublishedAt" | "showTurnout"
>;

interface ResultsReleasePanelProps {
  election: Election;
  /** Called after publishing/unpublishing so the editor reloads the election. */
  onChanged: () => Promise<unknown>;
  onNotice: (notice: Notice | null) => void;
}

function releaseStatus(e: Election): { title: string; body: string } {
  const audience = AUDIENCE[e.resultsVisibility];
  if (e.resultsRelease === "AUTOMATIC") {
    return {
      title: "Released automatically",
      body: `Results became visible to ${audience} when voting closed. Change this in Settings.`,
    };
  }
  if (e.resultsPublishedAt) {
    return {
      title: `Released ${formatDateTime(e.resultsPublishedAt)}`,
      body: `Visible to ${audience}.`,
    };
  }
  return {
    title: "Not released",
    body: `Only organizers can see these results. Releasing them makes them visible to ${audience}.`,
  };
}

/** Admin "Results" tab for a closed election: the tally, plus releasing or hiding it. */
export function ResultsReleasePanel({ election, onChanged, onNotice }: ResultsReleasePanelProps) {
  const { data, error, loading, reload } = useAsync(
    (signal) => getElectionResults(election.id, signal),
    [election.id, election.resultsPublishedAt, election.resultsRelease],
  );
  const [confirming, setConfirming] = useState<"publish" | "unpublish" | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [pending, setPending] = useState(false);

  const low = data ? lowTurnoutPositions(data.positions) : [];
  const manual = election.resultsRelease === "MANUAL";
  const released = Boolean(election.resultsPublishedAt);
  const status = releaseStatus(election);

  function close() {
    setConfirming(null);
    setAcknowledged(false);
  }

  async function run(action: "publish" | "unpublish") {
    setPending(true);
    try {
      if (action === "publish") await publishResults(election.id, low.length > 0 && acknowledged);
      else await unpublishResults(election.id);
      await onChanged();
      onNotice({
        tone: "success",
        title: action === "publish" ? "Results released" : "Results hidden",
        message:
          action === "publish"
            ? `They're now visible to ${AUDIENCE[election.resultsVisibility]}.`
            : "Only organizers can see them until you release them again.",
      });
    } catch (err) {
      onNotice({ tone: "error", ...describeAdminError(err, "We couldn't update the results") });
    } finally {
      setPending(false);
      close();
    }
  }

  return (
    <div className="space-y-6">
      <Panel as="section" aria-labelledby="release-heading">
        <PanelTitle id="release-heading" title={status.title} description={status.body} />
        {election.resultsVisibility === "ADMINS_ONLY" && manual && !released && (
          <p className="mb-4 text-footnote text-ink-2">
            Visibility is set to admins only, so releasing won't show results to students.
          </p>
        )}
        {manual && (
          <div className="flex flex-wrap gap-2">
            {released ? (
              <Button
                variant="secondary"
                onClick={() => setConfirming("unpublish")}
                disabled={pending}
                leftIcon={<EyeOff className="size-4" aria-hidden="true" />}
              >
                Hide results
              </Button>
            ) : (
              <Button
                onClick={() => setConfirming("publish")}
                disabled={pending || !data}
                leftIcon={<Send className="size-4" aria-hidden="true" />}
              >
                Release results
              </Button>
            )}
          </div>
        )}
      </Panel>

      {low.length > 0 && (
        <Alert tone="warning" icon={<ShieldAlert aria-hidden="true" />} title="Low turnout could reveal how people voted">
          <p>
            These positions had fewer than {RESULTS_PRIVACY_MIN_BALLOTS} ballots, so their totals could show how
            individual students voted:
          </p>
          <ul className="mt-2 list-disc pl-5">
            {low.map((p) => (
              <li key={p.positionId}>
                {p.title}: {p.totalBallots} {p.totalBallots === 1 ? "ballot" : "ballots"}
              </li>
            ))}
          </ul>
        </Alert>
      )}

      {data ? (
        <ResultsView results={data} />
      ) : loading ? (
        <div aria-busy="true" className="space-y-6">
          <span className="sr-only" role="status">
            Loading results…
          </span>
          <Skeleton className="h-24 w-full rounded-panel" />
          <Skeleton className="h-56 w-full rounded-panel" />
        </div>
      ) : (
        <ErrorState title="We couldn't load the results" error={error} onRetry={reload} />
      )}

      <ConfirmDialog
        open={confirming === "publish"}
        title="Release results?"
        description={`Results for “${election.title}” will be visible to ${AUDIENCE[election.resultsVisibility]}.`}
        confirmLabel="Release results"
        loading={pending}
        confirmDisabled={low.length > 0 && !acknowledged}
        onCancel={close}
        onConfirm={() => void run("publish")}
      >
        {low.length > 0 && (
          <Checkbox
            label="I understand that totals for low-turnout positions could reveal how individuals voted"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
          />
        )}
      </ConfirmDialog>
      <ConfirmDialog
        open={confirming === "unpublish"}
        title="Hide results?"
        description="Students will no longer see the results. Anyone who already saw them may have shared them."
        confirmLabel="Hide results"
        tone="danger"
        loading={pending}
        onCancel={close}
        onConfirm={() => void run("unpublish")}
      />
    </div>
  );
}
