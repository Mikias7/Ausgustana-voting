import { useState, type ReactNode } from "react";
import { Copy, ExternalLink, Send, Square, Trash2, Undo2, XCircle } from "lucide-react";
import type { AdminElectionDetail } from "@asa/shared";
import { Button, buttonClasses } from "../ui/Button";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { actionsForPhase, plural, type ElectionActionId } from "../../utils/adminElections";
import { formatDateTime } from "../../utils/dates";

type ConfirmableAction = Exclude<ElectionActionId, "viewPublic">;

interface ElectionActionsProps {
  election: Pick<AdminElectionDetail, "id" | "title" | "phase" | "startsAt" | "endsAt" | "votedCount" | "publishIssues">;
  /** Runs an action; resolves when done (errors are reported by the caller). */
  onAction: (action: ConfirmableAction) => Promise<void>;
  /** id of the readiness checklist, linked to the disabled Publish button. */
  checklistId?: string;
}

interface ConfirmCopy {
  title: string;
  description: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  tone: "primary" | "danger";
}

function confirmCopy(action: ConfirmableAction, e: ElectionActionsProps["election"]): ConfirmCopy | null {
  const name = `“${e.title}”`;
  switch (action) {
    case "publish":
      return {
        title: "Publish this election?",
        description: (
          <>
            Students will see {name} on the site right away. Voting opens automatically on{" "}
            <strong className="font-semibold text-ink">{formatDateTime(e.startsAt)}</strong> and closes on{" "}
            <strong className="font-semibold text-ink">{formatDateTime(e.endsAt)}</strong>. Once voting opens, positions,
            candidates, eligibility and dates are locked.
          </>
        ),
        confirmLabel: "Publish",
        tone: "primary",
      };
    case "deleteDraft":
      return {
        title: "Delete this draft?",
        description: `${name} and all of its positions and candidates will be permanently deleted.`,
        confirmLabel: "Delete draft",
        cancelLabel: "Keep draft",
        tone: "danger",
      };
    case "unpublish":
      return {
        title: "Unpublish this election?",
        description: `${name} goes back to being a draft. Students won't see it until you publish it again.`,
        confirmLabel: "Unpublish",
        tone: "primary",
      };
    case "cancel":
      return {
        title: "Cancel this election?",
        description:
          e.phase === "open"
            ? `Voting in ${name} stops immediately and students will see it as cancelled. This can't be undone.`
            : `Students will see ${name} as cancelled and voting will never open. This can't be undone.`,
        confirmLabel: "Cancel election",
        cancelLabel: "Keep election",
        tone: "danger",
      };
    case "close":
      return {
        title: "Close voting now?",
        description: (
          <>
            Voting is scheduled to close on{" "}
            <strong className="font-semibold text-ink">{formatDateTime(e.endsAt)}</strong>. Closing early stops voting
            for everyone immediately and can&apos;t be undone. {plural(e.votedCount, "student")}{" "}
            {e.votedCount === 1 ? "has" : "have"} voted so far.
          </>
        ),
        confirmLabel: "Close voting",
        cancelLabel: "Keep voting open",
        tone: "danger",
      };
    case "duplicate":
      return null;
  }
}

/** Primary actions for the editor header, by phase (see `actionsForPhase`). */
export function ElectionActions({ election, onAction, checklistId }: ElectionActionsProps) {
  const [confirming, setConfirming] = useState<ConfirmableAction | null>(null);
  const [pending, setPending] = useState<ConfirmableAction | null>(null);
  const actions = actionsForPhase(election.phase);
  const blocked = election.publishIssues.length > 0;

  async function run(action: ConfirmableAction) {
    setPending(action);
    try {
      await onAction(action);
    } finally {
      setPending(null);
      setConfirming(null);
    }
  }

  function start(action: ConfirmableAction) {
    if (confirmCopy(action, election)) setConfirming(action);
    else void run(action);
  }

  const copy = confirming ? confirmCopy(confirming, election) : null;
  const busy = pending !== null;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {actions.includes("publish") && (
          <Button
            onClick={() => start("publish")}
            disabled={blocked || busy}
            aria-describedby={blocked ? checklistId : undefined}
            leftIcon={<Send className="size-4" aria-hidden="true" />}
          >
            Publish
          </Button>
        )}
        {actions.includes("close") && (
          <Button
            variant="danger"
            onClick={() => start("close")}
            disabled={busy}
            leftIcon={<Square className="size-4" aria-hidden="true" />}
          >
            Close voting early
          </Button>
        )}
        {actions.includes("unpublish") && (
          <Button
            variant="secondary"
            onClick={() => start("unpublish")}
            disabled={busy}
            leftIcon={<Undo2 className="size-4" aria-hidden="true" />}
          >
            Unpublish
          </Button>
        )}
        {actions.includes("cancel") && (
          <Button
            variant="secondary"
            onClick={() => start("cancel")}
            disabled={busy}
            leftIcon={<XCircle className="size-4" aria-hidden="true" />}
          >
            Cancel election
          </Button>
        )}
        {actions.includes("deleteDraft") && (
          <Button
            variant="secondary"
            onClick={() => start("deleteDraft")}
            disabled={busy}
            leftIcon={<Trash2 className="size-4" aria-hidden="true" />}
          >
            Delete draft
          </Button>
        )}
        {actions.includes("duplicate") && (
          <Button
            variant="ghost"
            onClick={() => start("duplicate")}
            loading={pending === "duplicate"}
            disabled={busy}
            leftIcon={<Copy className="size-4" aria-hidden="true" />}
          >
            Duplicate
          </Button>
        )}
        {actions.includes("viewPublic") && (
          <a
            href={`/elections/${encodeURIComponent(election.id)}`}
            target="_blank"
            rel="noreferrer"
            className={buttonClasses("ghost")}
          >
            <ExternalLink className="size-4" aria-hidden="true" />
            View public page
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        )}
      </div>
      <ConfirmDialog
        open={copy !== null}
        title={copy?.title ?? ""}
        description={copy?.description}
        confirmLabel={copy?.confirmLabel}
        cancelLabel={copy?.cancelLabel}
        tone={copy?.tone}
        loading={busy}
        onCancel={() => setConfirming(null)}
        onConfirm={() => confirming && void run(confirming)}
      />
    </>
  );
}
