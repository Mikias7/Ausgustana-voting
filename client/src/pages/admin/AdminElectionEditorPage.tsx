import { useEffect, useId, useState, type FormEvent } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Lock } from "lucide-react";
import {
  electionUpdateSchema,
  type AdminElectionDetail,
  type EligibilityRule,
  type PublishIssue,
} from "@asa/shared";
import { isApiError } from "../../api/client";
import { BackLink, PanelTitle } from "../../components/admin-elections/AdminBits";
import { DateRangeFields } from "../../components/admin-elections/DateRangeFields";
import { ElectionActions } from "../../components/admin-elections/ElectionActions";
import { EligibilityRuleEditor } from "../../components/admin-elections/EligibilityRuleEditor";
import { PositionsEditor, type Notice } from "../../components/admin-elections/PositionsEditor";
import { PublishChecklist } from "../../components/admin-elections/PublishChecklist";
import { ResultsReleasePanel } from "../../components/admin-elections/ResultsReleasePanel";
import {
  ResultsSettingsFields,
  type ResultsSettingsValue,
} from "../../components/admin-elections/ResultsSettingsFields";
import { Alert } from "../../components/ui/Alert";
import { Button } from "../../components/ui/Button";
import { ErrorState } from "../../components/ui/ErrorState";
import { Input } from "../../components/ui/Input";
import { PageHeader } from "../../components/ui/PageHeader";
import { Panel } from "../../components/ui/Panel";
import { SegmentedControl } from "../../components/ui/SegmentedControl";
import { Skeleton } from "../../components/ui/Skeleton";
import { StatusIndicator } from "../../components/ui/StatusIndicator";
import { TabPanel } from "../../components/ui/TabPanel";
import { Textarea } from "../../components/ui/Textarea";
import { useAdminElection, type AdminElectionState } from "../../hooks/useAdminElections";
import { usePageTitle } from "../../hooks/usePageTitle";
import { useSearchParamState } from "../../hooks/useSearchParamState";
import { useVoterLists } from "../../hooks/useVoterLists";
import {
  describeAdminError,
  ELECTION_FRIENDLY_ERRORS,
  eligibilityProblem,
  LOCK_MESSAGE,
  isEditablePhase,
  plural,
} from "../../utils/adminElections";
import { formatDateTime } from "../../utils/dates";
import { isoToLocalInput, localInputToIso } from "../../utils/datetimeLocal";
import { fieldErrorsFromApiError, fieldErrorsFromIssues, hasErrors, type FieldErrors } from "../../utils/formErrors";

const TABS = ["details", "positions", "settings", "results"] as const;
type Tab = (typeof TABS)[number];

interface SectionProps {
  election: AdminElectionDetail;
  state: AdminElectionState;
  onNotice: (notice: Notice | null) => void;
}

// ---------- Details ----------

interface DetailsValues {
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
}

const detailsFrom = (e: AdminElectionDetail): DetailsValues => ({
  title: e.title,
  description: e.description ?? "",
  startsAt: isoToLocalInput(e.startsAt),
  endsAt: isoToLocalInput(e.endsAt),
});

const sameDetails = (a: DetailsValues, b: DetailsValues) =>
  a.title === b.title && a.description === b.description && a.startsAt === b.startsAt && a.endsAt === b.endsAt;

function DetailsSection({ election, state, onNotice }: SectionProps) {
  const base = detailsFrom(election);
  const [draft, setDraft] = useState<DetailsValues | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const values = draft ?? base;
  const dirty = draft !== null && !sameDetails(draft, base);
  const editable = isEditablePhase(election.phase);
  const datesLocked = election.locked || !editable;

  const set = (patch: Partial<DetailsValues>) => {
    setDraft({ ...values, ...patch });
    setErrors((e) => ({ ...e, ...Object.fromEntries(Object.keys(patch).map((k) => [k, undefined])) }));
  };

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!dirty) return;
    const patch: Record<string, unknown> = {};
    if (values.title !== base.title) patch.title = values.title;
    if (values.description !== base.description) patch.description = values.description.trim() || null;
    if (!datesLocked) {
      if (values.startsAt !== base.startsAt) patch.startsAt = localInputToIso(values.startsAt) ?? "";
      if (values.endsAt !== base.endsAt) patch.endsAt = localInputToIso(values.endsAt) ?? "";
    }
    const next: FieldErrors = {};
    const parsed = electionUpdateSchema.safeParse(patch);
    if (!parsed.success) Object.assign(next, fieldErrorsFromIssues(parsed.error.issues, ELECTION_FRIENDLY_ERRORS));
    const start = localInputToIso(values.startsAt);
    const end = localInputToIso(values.endsAt);
    if (!next.endsAt && start && end && new Date(end) <= new Date(start)) {
      next.endsAt = "End time must be after start time";
    }
    if (hasErrors(next) || !parsed.success) {
      setErrors(next);
      return;
    }
    setSaving(true);
    try {
      await state.update(parsed.data);
      setDraft(null);
      onNotice({ tone: "success", title: "Details saved" });
    } catch (error) {
      const fieldErrors = fieldErrorsFromApiError(error);
      if (hasErrors(fieldErrors)) setErrors(fieldErrors);
      else onNotice({ tone: "error", ...describeAdminError(error, "We couldn't save the details") });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Panel as="section" aria-labelledby="details-heading">
      <PanelTitle id="details-heading" title="Details" />
      <form noValidate onSubmit={submit} className="space-y-5">
        <Input
          id="edit-title"
          label="Title"
          required
          value={values.title}
          onChange={(e) => set({ title: e.target.value })}
          error={errors.title}
          disabled={!editable}
          maxLength={150}
        />
        <Textarea
          id="edit-desc"
          label="Description"
          hint="Optional. Shown to students on the election page."
          rows={4}
          value={values.description}
          onChange={(e) => set({ description: e.target.value })}
          error={errors.description}
          disabled={!editable}
          maxLength={4000}
        />
        <DateRangeFields
          idPrefix="edit"
          startsAt={values.startsAt}
          endsAt={values.endsAt}
          onChange={(d) => set(d)}
          errors={{ startsAt: errors.startsAt, endsAt: errors.endsAt }}
          disabled={datesLocked}
          disabledNote={
            election.locked
              ? "Dates are locked once voting starts. Use “Close voting early” to end it sooner."
              : "This election has ended."
          }
        />
        {editable && (
          <div className="flex flex-col-reverse gap-3 border-t border-hairline pt-5 sm:flex-row sm:items-center sm:justify-end">
            {dirty && (
              <p className="text-footnote font-normal text-ink-2 sm:mr-auto" role="status">
                You have unsaved changes.
              </p>
            )}
            {dirty && (
              <Button
                variant="secondary"
                onClick={() => {
                  setDraft(null);
                  setErrors({});
                }}
                disabled={saving}
              >
                Discard
              </Button>
            )}
            <Button type="submit" disabled={!dirty} loading={saving}>
              Save details
            </Button>
          </div>
        )}
      </form>
    </Panel>
  );
}

// ---------- Settings (eligibility + results) ----------

function EligibilityPanel({ election, state, onNotice, voterLists }: SectionProps & { voterLists: ReturnType<typeof useVoterLists> }) {
  const [draft, setDraft] = useState<EligibilityRule | null>(null);
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const value = draft ?? election.eligibility;
  const dirty = draft !== null && JSON.stringify(draft) !== JSON.stringify(election.eligibility);
  const readOnly = election.locked || !isEditablePhase(election.phase);

  async function save() {
    const problem = eligibilityProblem(value);
    if (problem) {
      setError(problem);
      return;
    }
    setSaving(true);
    try {
      await state.update({ eligibility: value });
      setDraft(null);
      onNotice({ tone: "success", title: "Eligibility saved" });
    } catch (err) {
      onNotice({ tone: "error", ...describeAdminError(err, "We couldn't save eligibility") });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Panel as="section" aria-labelledby="elig-heading">
      <PanelTitle
        id="elig-heading"
        title="Who can vote"
        description="Applies to the whole election. Positions can narrow it further (for example, class senators)."
      />
      <EligibilityRuleEditor
        id="edit-elig"
        legend={<span className="sr-only">Who can vote</span>}
        value={value}
        onChange={(rule) => {
          setDraft(rule);
          setError(undefined);
        }}
        voterLists={voterLists.data}
        voterListsLoading={voterLists.loading}
        disabled={readOnly}
        disabledNote={election.locked ? "Eligibility is locked once voting starts." : undefined}
        error={error}
      />
      {!readOnly && (
        <div className="mt-5 flex flex-col-reverse gap-3 border-t border-hairline pt-5 sm:flex-row sm:justify-end">
          {dirty && (
            <Button variant="secondary" onClick={() => setDraft(null)} disabled={saving}>
              Discard
            </Button>
          )}
          <Button onClick={save} disabled={!dirty} loading={saving}>
            Save eligibility
          </Button>
        </div>
      )}
    </Panel>
  );
}

const resultsFrom = (e: AdminElectionDetail): ResultsSettingsValue => ({
  resultsVisibility: e.resultsVisibility,
  resultsRelease: e.resultsRelease,
  showTurnout: e.showTurnout,
});

function ResultsPanel({ election, state, onNotice }: SectionProps) {
  const base = resultsFrom(election);
  const [draft, setDraft] = useState<ResultsSettingsValue | null>(null);
  const [saving, setSaving] = useState(false);
  const value = draft ?? base;
  const dirty = draft !== null && JSON.stringify(draft) !== JSON.stringify(base);
  const editable = isEditablePhase(election.phase);

  async function save() {
    setSaving(true);
    try {
      await state.update(value);
      setDraft(null);
      onNotice({ tone: "success", title: "Results settings saved" });
    } catch (err) {
      onNotice({ tone: "error", ...describeAdminError(err, "We couldn't save results settings") });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Panel as="section" aria-labelledby="results-heading">
      <PanelTitle
        id="results-heading"
        title="Results"
        description={editable ? "You can change these at any time, even while voting is open." : undefined}
      />
      <ResultsSettingsFields name="edit-results" value={value} onChange={setDraft} disabled={!editable} />
      {editable && (
        <div className="mt-5 flex flex-col-reverse gap-3 border-t border-hairline pt-5 sm:flex-row sm:justify-end">
          {dirty && (
            <Button variant="secondary" onClick={() => setDraft(null)} disabled={saving}>
              Discard
            </Button>
          )}
          <Button onClick={save} disabled={!dirty} loading={saving}>
            Save results settings
          </Button>
        </div>
      )}
    </Panel>
  );
}

// ---------- Page ----------

function EditorSkeleton() {
  return (
    <div aria-busy="true">
      <span className="sr-only" role="status">
        Loading election…
      </span>
      <div className="mb-10 space-y-4" aria-hidden="true">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-9 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      <Skeleton className="mb-6 h-9 w-72" />
      <Skeleton className="h-64 w-full rounded-panel" />
    </div>
  );
}

const SUCCESS: Record<string, string> = {
  publish: "Published. Students can see the election now, and voting opens at the start time.",
  unpublish: "Unpublished. The election is a draft again and hidden from students.",
  close: "Voting is closed.",
  cancel: "The election has been cancelled.",
};

export function AdminElectionEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const tabsId = useId();
  const state = useAdminElection(id);
  const { election } = state;
  usePageTitle(election ? `${election.title} · Admin` : "Election · Admin");
  const [tabParam, setTab] = useSearchParamState<Tab>("tab", TABS, "details");
  const [notice, setNotice] = useState<Notice | null>(
    () => (location.state as { notice?: Notice } | null)?.notice ?? null,
  );
  const voterLists = useVoterLists(election?.organization.slug, { enabled: Boolean(election) });

  // A fresh notice per election (e.g. after duplicating, the new draft's page).
  useEffect(() => {
    setNotice((location.state as { notice?: Notice } | null)?.notice ?? null);
  }, [id]);

  async function onAction(action: "publish" | "deleteDraft" | "unpublish" | "cancel" | "close" | "duplicate") {
    if (!election) return;
    try {
      if (action === "deleteDraft") {
        await state.remove();
        navigate("/admin/elections", { replace: true });
        return;
      }
      if (action === "duplicate") {
        const copy = await state.duplicate();
        navigate(`/admin/elections/${copy.id}`, {
          state: {
            notice: {
              tone: "success",
              title: "Duplicated as a new draft",
              message: "Check the title and dates, then publish when it's ready.",
            },
          },
        });
        return;
      }
      await state.lifecycle(action);
      setNotice({ tone: "success", title: SUCCESS[action] });
    } catch (error) {
      if (isApiError(error, 404)) {
        navigate("/admin/elections", { replace: true });
        return;
      }
      setNotice({ tone: "error", ...describeAdminError(error) });
    }
  }

  function jumpToIssue(issue: PublishIssue) {
    setTab("positions");
    requestAnimationFrame(() =>
      document.getElementById(`position-${issue.positionId}`)?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  }

  if (state.error && !election) {
    const notFound = isApiError(state.error, 404);
    return (
      <>
        <BackLink to="/admin/elections" label="Elections" />
        <ErrorState
          title={notFound ? "Election not found" : "We couldn't load this election"}
          message={notFound ? "It may have been deleted, or you don't manage its organization." : undefined}
          error={state.error}
        />
      </>
    );
  }
  if (!election) return <EditorSkeleton />;

  const { phase } = election;
  // The Results tab only exists once voting has closed.
  const tab: Tab = tabParam === "results" && phase !== "closed" ? "details" : tabParam;
  const structureEditable = !election.locked && isEditablePhase(phase);
  const positionTitles = Object.fromEntries(election.positions.map((p) => [p.id, p.title]));
  const sectionProps = { election, state, onNotice: setNotice };

  return (
    <>
      <PageHeader
        breadcrumb={<BackLink to="/admin/elections" label="Elections" />}
        eyebrow={election.organization.name}
        title={election.title}
        description={
          <span className="flex flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3">
            <StatusIndicator phase={phase} />
            <span className="text-callout">
              <time dateTime={election.startsAt}>{formatDateTime(election.startsAt)}</time> –{" "}
              <time dateTime={election.endsAt}>{formatDateTime(election.endsAt)}</time>
            </span>
            {(phase === "open" || phase === "closed") && (
              <span className="tabular text-callout">{plural(election.votedCount, "student")} voted</span>
            )}
          </span>
        }
        actions={<ElectionActions election={election} onAction={onAction} checklistId="publish-checklist" />}
        className="mb-8 sm:mb-10"
      />

      <div className="mb-8 space-y-4">
        {election.locked && phase === "open" && (
          <Alert tone="info" icon={<Lock aria-hidden="true" />} title="Voting is open">
            {LOCK_MESSAGE}
          </Alert>
        )}
        {phase === "closed" && (
          <Alert tone="info" title="Voting has closed">
            This election is read-only. Review and release the results in the Results tab.
          </Alert>
        )}
        {phase === "cancelled" && (
          <Alert tone="warning" title="This election was cancelled">
            It's read-only. Duplicate it to run it again.
          </Alert>
        )}
        {notice && (
          <Alert tone={notice.tone} title={notice.title}>
            {notice.message}
          </Alert>
        )}
        {phase === "draft" && (
          <Panel id="publish-checklist" aria-label="Publish checklist">
            <PublishChecklist issues={election.publishIssues} positionTitles={positionTitles} onIssueClick={jumpToIssue} />
          </Panel>
        )}
        {phase === "upcoming" && election.publishIssues.length > 0 && (
          <Panel id="publish-checklist" aria-label="Problems to fix before voting opens">
            <PublishChecklist
              heading="Fix these before voting opens"
              issues={election.publishIssues}
              positionTitles={positionTitles}
              onIssueClick={jumpToIssue}
            />
          </Panel>
        )}
      </div>

      <div className="mb-6">
        <SegmentedControl
          id={tabsId}
          label="Election sections"
          items={[
            { id: "details", label: "Details" },
            { id: "positions", label: "Positions", count: election.positions.length },
            { id: "settings", label: "Settings" },
            ...(phase === "closed" ? [{ id: "results" as const, label: "Results" }] : []),
          ]}
          value={tab}
          onChange={setTab}
          className="w-full sm:w-auto"
        />
      </div>

      <TabPanel tabsId={tabsId} value={tab}>
        {tab === "details" && <DetailsSection {...sectionProps} />}
        {tab === "positions" && (
          <PositionsEditor
            election={election}
            actions={state}
            editable={structureEditable}
            voterLists={voterLists.data}
            voterListsLoading={voterLists.loading}
            onNotice={setNotice}
          />
        )}
        {tab === "settings" && (
          <div className="space-y-6">
            <EligibilityPanel {...sectionProps} voterLists={voterLists} />
            <ResultsPanel {...sectionProps} />
          </div>
        )}
        {tab === "results" && (
          <ResultsReleasePanel election={election} onChanged={state.refresh} onNotice={setNotice} />
        )}
      </TabPanel>
    </>
  );
}
