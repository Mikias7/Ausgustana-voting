import { useState } from "react";
import { ArrowDown, ArrowUp, ListPlus, Pencil, Plus, Trash2, UserPlus, Vote } from "lucide-react";
import type { AdminCandidate, AdminElectionDetail, AdminPosition, VoterListSummary } from "@asa/shared";
import { createPosition } from "../../api/admin/elections";
import { Alert } from "../ui/Alert";
import { Avatar } from "../ui/Avatar";
import { Button } from "../ui/Button";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { EmptyState } from "../ui/EmptyState";
import { Panel } from "../ui/Panel";
import type { AdminElectionState } from "../../hooks/useAdminElections";
import { ASA_ORG_SLUG } from "../../utils/elections";
import {
  canAddClassSenators,
  classSenatorInputs,
  describeAdminError,
  moveId,
  positionRulesLabel,
} from "../../utils/adminElections";
import { CandidateFormSheet } from "./CandidateFormSheet";
import { IconButton } from "./IconButton";
import { PositionFormSheet } from "./PositionFormSheet";

export interface Notice {
  tone: "error" | "success" | "info";
  title: string;
  message?: string;
}

interface PositionsEditorProps {
  election: AdminElectionDetail;
  actions: AdminElectionState;
  /** Structure can change (not locked, not closed/cancelled). */
  editable: boolean;
  voterLists?: VoterListSummary[];
  voterListsLoading?: boolean;
  onNotice: (notice: Notice | null) => void;
}

type DeleteTarget =
  | { kind: "position"; position: AdminPosition }
  | { kind: "candidate"; candidate: AdminCandidate; position: AdminPosition };

/** Moves focus to the moved item's arrow button (or its sibling when it reached the end). */
function refocusMove(key: string, dir: "up" | "down") {
  requestAnimationFrame(() => {
    const preferred = document.querySelector<HTMLButtonElement>(`[data-move="${key}-${dir}"]`);
    const other = document.querySelector<HTMLButtonElement>(`[data-move="${key}-${dir === "up" ? "down" : "up"}"]`);
    (preferred && !preferred.disabled ? preferred : other)?.focus();
  });
}

export function PositionsEditor({
  election,
  actions,
  editable,
  voterLists,
  voterListsLoading,
  onNotice,
}: PositionsEditorProps) {
  const positions = election.positions;
  const [positionSheet, setPositionSheet] = useState<{ open: boolean; position?: AdminPosition }>({ open: false });
  const [candidateSheet, setCandidateSheet] = useState<{
    open: boolean;
    position?: AdminPosition;
    candidate?: AdminCandidate;
  }>({ open: false });
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [moving, setMoving] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [template, setTemplate] = useState<{ done: number; total: number } | null>(null);

  const showTemplate = editable && election.organization.slug === ASA_ORG_SLUG && canAddClassSenators(positions);

  async function move(kind: "position" | "candidate", ids: string[], index: number, delta: -1 | 1, label: string, positionId?: string) {
    const next = moveId(ids, index, delta);
    if (!next) return;
    setMoving(true);
    try {
      if (kind === "position") await actions.movePositions(next);
      else await actions.moveCandidates(positionId!, next);
      setAnnouncement(`${label} moved ${delta < 0 ? "up" : "down"} to position ${index + delta + 1} of ${ids.length}.`);
      refocusMove(ids[index], delta < 0 ? "up" : "down");
    } catch (error) {
      onNotice({ tone: "error", ...describeAdminError(error, "We couldn't reorder") });
    } finally {
      setMoving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      if (deleteTarget.kind === "position") await actions.removePosition(deleteTarget.position.id);
      else await actions.removeCandidate(deleteTarget.candidate.id);
      onNotice(null);
    } catch (error) {
      onNotice({ tone: "error", ...describeAdminError(error, "We couldn't delete that") });
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  async function addClassSenators() {
    const inputs = classSenatorInputs();
    setTemplate({ done: 0, total: inputs.length });
    let done = 0;
    try {
      // One at a time, so the seats keep their order.
      for (const input of inputs) {
        await createPosition(election.id, input);
        done += 1;
        setTemplate({ done, total: inputs.length });
      }
      onNotice({ tone: "success", title: "Class senator seats added", message: "Now add candidates to each seat." });
    } catch (error) {
      const { title, message } = describeAdminError(error, "We couldn't add every seat");
      onNotice({ tone: "error", title, message: `Added ${done} of ${inputs.length} seats. ${message}` });
    } finally {
      setTemplate(null);
      await actions.refresh();
    }
  }

  const positionIds = positions.map((p) => p.id);

  return (
    <section aria-labelledby="positions-heading" className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="positions-heading" className="text-title-2">
            Positions &amp; candidates
          </h2>
          <p className="mt-1 text-callout text-ink-2">The ballot shows positions and candidates in this order.</p>
        </div>
        {editable && (
          <div className="flex flex-wrap gap-2">
            {showTemplate && (
              <Button
                variant="secondary"
                onClick={addClassSenators}
                loading={template !== null}
                leftIcon={<ListPlus className="size-4" aria-hidden="true" />}
              >
                Add class senator seats
              </Button>
            )}
            <Button
              variant="tinted"
              onClick={() => setPositionSheet({ open: true })}
              leftIcon={<Plus className="size-4" aria-hidden="true" />}
            >
              Add position
            </Button>
          </div>
        )}
      </div>

      {template && (
        <p role="status" className="text-callout text-ink-2">
          Adding class senator seats… {template.done} of {template.total}
        </p>
      )}
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>

      {positions.length === 0 ? (
        <Panel padding="none">
          <EmptyState
            compact
            icon={<Vote aria-hidden="true" />}
            title="No positions yet"
            description={
              editable
                ? "Add the roles students will vote for, like President or Treasurer, then add candidates to each."
                : "This election has no positions."
            }
            action={
              editable ? (
                <Button onClick={() => setPositionSheet({ open: true })} leftIcon={<Plus className="size-4" aria-hidden="true" />}>
                  Add position
                </Button>
              ) : undefined
            }
          />
        </Panel>
      ) : (
        <ol className="space-y-4">
          {positions.map((position, index) => {
            const flags = [
              position.allowWriteIn && "Write-ins allowed",
              position.allowAbstain && "Abstain allowed",
            ].filter(Boolean);
            const candidateIds = position.candidates.map((c) => c.id);
            return (
              <li key={position.id} id={`position-${position.id}`} className="scroll-mt-24">
                <Panel as="article" padding="none" aria-labelledby={`position-title-${position.id}`}>
                  <div className="flex flex-wrap items-start gap-x-3 gap-y-1 px-5 pt-5 pb-4 sm:px-6">
                    <div className="min-w-[12rem] flex-1">
                      <h3 id={`position-title-${position.id}`} className="text-title-3">
                        {position.title}
                      </h3>
                      <p className="mt-1 text-footnote font-normal text-ink-2">
                        <span className="tabular">{positionRulesLabel(position)}</span>
                        {" · "}
                        {position.eligibilityText}
                        {flags.length > 0 && ` · ${flags.join(" · ")}`}
                      </p>
                      {position.description && (
                        <p className="mt-2 line-clamp-2 text-callout text-ink-2">{position.description}</p>
                      )}
                    </div>
                    {editable && (
                      <div className="-mr-2 ml-auto flex shrink-0">
                        <IconButton
                          data-move={`${position.id}-up`}
                          label={`Move ${position.title} up`}
                          icon={<ArrowUp aria-hidden="true" />}
                          disabled={index === 0 || moving}
                          onClick={() => move("position", positionIds, index, -1, position.title)}
                        />
                        <IconButton
                          data-move={`${position.id}-down`}
                          label={`Move ${position.title} down`}
                          icon={<ArrowDown aria-hidden="true" />}
                          disabled={index === positions.length - 1 || moving}
                          onClick={() => move("position", positionIds, index, 1, position.title)}
                        />
                        <IconButton
                          label={`Edit ${position.title}`}
                          icon={<Pencil aria-hidden="true" />}
                          onClick={() => setPositionSheet({ open: true, position })}
                        />
                        <IconButton
                          tone="danger"
                          label={`Delete ${position.title}`}
                          icon={<Trash2 aria-hidden="true" />}
                          onClick={() => setDeleteTarget({ kind: "position", position })}
                        />
                      </div>
                    )}
                  </div>

                  <div className="border-t border-hairline">
                    {position.candidates.length === 0 ? (
                      <p className="px-5 py-4 text-callout text-ink-2 sm:px-6">No candidates yet.</p>
                    ) : (
                      <ul aria-label={`Candidates for ${position.title}`}>
                        {position.candidates.map((candidate, ci) => (
                          <li
                            key={candidate.id}
                            className="flex flex-wrap items-center gap-x-3.5 gap-y-1 border-t border-hairline px-5 py-3 first:border-t-0 sm:px-6"
                          >
                            <Avatar name={candidate.name} src={candidate.photoUrl} />
                            <div className="min-w-[9rem] flex-1">
                              <p className="text-body font-medium text-ink">{candidate.name}</p>
                              {candidate.bio && (
                                <p className="line-clamp-1 text-footnote font-normal text-ink-2">{candidate.bio}</p>
                              )}
                            </div>
                            {editable && (
                              <div className="-mr-2 ml-auto flex shrink-0">
                                <IconButton
                                  data-move={`${candidate.id}-up`}
                                  label={`Move ${candidate.name} up`}
                                  icon={<ArrowUp aria-hidden="true" />}
                                  disabled={ci === 0 || moving}
                                  onClick={() => move("candidate", candidateIds, ci, -1, candidate.name, position.id)}
                                />
                                <IconButton
                                  data-move={`${candidate.id}-down`}
                                  label={`Move ${candidate.name} down`}
                                  icon={<ArrowDown aria-hidden="true" />}
                                  disabled={ci === position.candidates.length - 1 || moving}
                                  onClick={() => move("candidate", candidateIds, ci, 1, candidate.name, position.id)}
                                />
                                <IconButton
                                  label={`Edit ${candidate.name}`}
                                  icon={<Pencil aria-hidden="true" />}
                                  onClick={() => setCandidateSheet({ open: true, position, candidate })}
                                />
                                <IconButton
                                  tone="danger"
                                  label={`Remove ${candidate.name}`}
                                  icon={<Trash2 aria-hidden="true" />}
                                  onClick={() => setDeleteTarget({ kind: "candidate", candidate, position })}
                                />
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                    {editable && (
                      <div className="border-t border-hairline px-3 py-2 sm:px-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setCandidateSheet({ open: true, position })}
                          leftIcon={<UserPlus className="size-4" aria-hidden="true" />}
                        >
                          Add candidate<span className="sr-only"> to {position.title}</span>
                        </Button>
                      </div>
                    )}
                  </div>
                </Panel>
              </li>
            );
          })}
        </ol>
      )}

      {!editable && positions.length > 0 && election.locked && (
        <Alert tone="info">Positions and candidates can't change once voting has started.</Alert>
      )}

      <PositionFormSheet
        open={positionSheet.open}
        position={positionSheet.position}
        voterLists={voterLists}
        voterListsLoading={voterListsLoading}
        onClose={() => setPositionSheet({ open: false })}
        onSubmit={(input) =>
          positionSheet.position
            ? actions.editPosition(positionSheet.position.id, input)
            : actions.addPosition(input)
        }
      />
      <CandidateFormSheet
        open={candidateSheet.open}
        positionTitle={candidateSheet.position?.title ?? ""}
        candidate={candidateSheet.candidate}
        onClose={() => setCandidateSheet({ open: false })}
        onSubmit={(input) =>
          candidateSheet.candidate
            ? actions.editCandidate(candidateSheet.candidate.id, input)
            : actions.addCandidate(candidateSheet.position!.id, input)
        }
      />
      <ConfirmDialog
        open={deleteTarget !== null}
        tone="danger"
        loading={deleting}
        title={deleteTarget?.kind === "position" ? "Delete this position?" : "Remove this candidate?"}
        description={
          deleteTarget?.kind === "position"
            ? `“${deleteTarget.position.title}” and its ${deleteTarget.position.candidates.length} ${
                deleteTarget.position.candidates.length === 1 ? "candidate" : "candidates"
              } will be removed from the ballot.`
            : deleteTarget
              ? `${deleteTarget.candidate.name} will be removed from ${deleteTarget.position.title}.`
              : undefined
        }
        confirmLabel={deleteTarget?.kind === "position" ? "Delete position" : "Remove candidate"}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </section>
  );
}
