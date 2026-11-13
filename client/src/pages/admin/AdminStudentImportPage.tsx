import { createContext, useContext, useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, CircleCheck } from "lucide-react";
import { IMPORT_MODES, type ImportMode, type ImportSummary, type RosterIssue } from "@asa/shared";
import { getErrorMessage, isApiError } from "../../api/client";
import { DestructiveSyncDialog } from "../../components/roster/DestructiveSyncDialog";
import { ImportIssueList } from "../../components/roster/ImportIssueList";
import { ImportStepper } from "../../components/roster/ImportStepper";
import { ImportCountsGrid, ImportSummaryView } from "../../components/roster/ImportSummaryView";
import { RosterFileDrop } from "../../components/roster/RosterFileDrop";
import { Alert } from "../../components/ui/Alert";
import { Button } from "../../components/ui/Button";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { PageHeader } from "../../components/ui/PageHeader";
import { Panel } from "../../components/ui/Panel";
import { SegmentedControl } from "../../components/ui/SegmentedControl";
import { TabPanel } from "../../components/ui/TabPanel";
import { usePageTitle } from "../../hooks/usePageTitle";
import { useRosterStats } from "../../hooks/useRoster";
import { useRosterImport, type RosterImportState } from "../../hooks/useRosterImport";
import { IMPORT_MODE_DESCRIPTIONS, IMPORT_MODE_LABELS, plural } from "../../utils/roster";
import { PlatformAdminOnly } from "./PlatformAdminOnly";

const MODE_ITEMS = IMPORT_MODES.map((id) => ({ id, label: IMPORT_MODE_LABELS[id] }));

function stepOf(state: RosterImportState): 0 | 1 | 2 {
  switch (state.status) {
    case "idle":
    case "previewing":
      return 0;
    case "preview":
    case "importing":
      return 1;
    case "confirmDestructive":
    case "error":
      return state.preview ? 1 : 0;
    case "done":
      return 2;
  }
}

const ERROR_COPY: Record<string, { title: string; message: string }> = {
  FILE_REQUIRED: { title: "Choose a file first", message: "Add a roster file, then preview the import." },
  UNSUPPORTED_FILE_TYPE: {
    title: "This file type isn't supported",
    message: "Upload a plain-text roster file ending in .txt or .csv (not a spreadsheet or PDF).",
  },
  INVALID_FILE_ENCODING: {
    title: "This file isn't UTF-8 text",
    message: "Save the roster as UTF-8 plain text (in Excel: CSV UTF-8) and try again.",
  },
  IMPORT_EMPTY: {
    title: "No valid rows found",
    message: "Nothing was imported. Check that the file follows the format below; the issues are listed underneath.",
  },
  FILE_TOO_LARGE: { title: "This file is too large", message: "Roster files can be up to 2 MB." },
};

/** Friendly copy for upload failures; falls back to the server's message (e.g. VALIDATION_ERROR). */
function describeError(error: unknown): { title: string; message: string } {
  if (isApiError(error) && ERROR_COPY[error.code]) return ERROR_COPY[error.code];
  if (isApiError(error, 413)) return ERROR_COPY.FILE_TOO_LARGE;
  if (isApiError(error) && error.code === "VALIDATION_ERROR") {
    return { title: "Check the import settings", message: getErrorMessage(error) };
  }
  return { title: "The import didn't go through", message: getErrorMessage(error) };
}

/** True after the first render, so later steps move focus but the initial page load doesn't. */
const FocusStepContext = createContext(false);

/** IMPORT_EMPTY carries the per-line issues in `details.issues`, so admins can see why every row failed. */
function issuesFromError(error: unknown): RosterIssue[] {
  if (!isApiError(error) || typeof error.details !== "object" || error.details === null) return [];
  const issues = (error.details as { issues?: unknown }).issues;
  return Array.isArray(issues) ? (issues as RosterIssue[]) : [];
}

function StepHeading({ children, id }: { children: string; id: string }) {
  const ref = useRef<HTMLHeadingElement>(null);
  const focusOnMount = useContext(FocusStepContext);
  // Move focus to each new step's heading so keyboard and screen-reader users land in context.
  useEffect(() => {
    if (focusOnMount) ref.current?.focus();
    // Mount only: each step heading focuses itself once.
  }, []);
  return (
    <h2 ref={ref} id={id} tabIndex={-1} className="text-title-2 focus-visible:outline-offset-4">
      {children}
    </h2>
  );
}

function FileFormatNote() {
  return (
    <div className="rounded-row bg-inset px-4 py-3.5 text-callout text-ink-2">
      <p className="font-semibold text-ink">File format</p>
      <p className="mt-1">One student per line, fields separated by a pipe, no header row:</p>
      <code className="mt-2 block overflow-x-auto rounded-[8px] bg-surface px-3 py-2 font-mono text-footnote whitespace-nowrap text-ink">
        Lastname|Firstname|username|email|class
      </code>
      <p className="mt-2">
        Class is <span className="font-medium text-ink">FR</span> (or FF), <span className="font-medium text-ink">SO</span>,{" "}
        <span className="font-medium text-ink">JR</span> or <span className="font-medium text-ink">SR</span>. Usernames match
        students across imports.
      </p>
    </div>
  );
}

function ChooseStep({
  file,
  fileError,
  mode,
  busy,
  error,
  onSelect,
  onMode,
  onPreview,
}: {
  file: File | null;
  fileError: string | null;
  mode: ImportMode;
  busy: boolean;
  error: unknown;
  onSelect: (file: File | null) => void;
  onMode: (mode: ImportMode) => void;
  onPreview: () => void;
}) {
  const modeId = useId();
  const failure = error ? describeError(error) : null;
  return (
    <Panel as="section" padding="lg" aria-labelledby="step-choose" className="space-y-8">
      <div>
        <StepHeading id="step-choose">Choose a roster file</StepHeading>
        <p className="mt-1.5 text-callout text-ink-2">You'll see a preview of every change before anything is saved.</p>
      </div>
      <RosterFileDrop file={file} error={fileError} onSelect={onSelect} disabled={busy} />
      <FileFormatNote />
      <div>
        <p id={`${modeId}-label`} className="mb-2.5 text-footnote text-ink">
          Import mode
        </p>
        <SegmentedControl
          id={modeId}
          label="Import mode"
          items={MODE_ITEMS}
          value={mode}
          onChange={onMode}
          className="w-full sm:w-auto"
        />
        <TabPanel tabsId={modeId} value={mode} className="mt-3">
          <p className="max-w-[560px] text-callout text-ink-2">{IMPORT_MODE_DESCRIPTIONS[mode]}</p>
        </TabPanel>
      </div>
      {failure && (
        <Alert tone="error" title={failure.title}>
          {failure.message}
        </Alert>
      )}
      {issuesFromError(error).length > 0 && <ImportIssueList issues={issuesFromError(error)} />}
      <div className="flex justify-end border-t border-hairline pt-6">
        <Button onClick={onPreview} disabled={!file} loading={busy} className="max-sm:w-full">
          Preview import
        </Button>
      </div>
    </Panel>
  );
}

function PreviewStep({
  preview,
  busy,
  error,
  destructiveOf,
  onBack,
  onImport,
}: {
  preview: ImportSummary;
  busy: boolean;
  /** On-roster count when this full sync is over the 50% threshold. */
  destructiveOf: number | null;
  error: unknown;
  onBack: () => void;
  onImport: () => void;
}) {
  const failure = error ? describeError(error) : null;
  const n = preview.counts.valid;
  return (
    <Panel as="section" padding="lg" aria-labelledby="step-preview" className="space-y-8">
      <div>
        <StepHeading id="step-preview">Preview</StepHeading>
        <p className="mt-1.5 text-callout text-ink-2">Nothing has been saved yet. Review the changes, then import.</p>
      </div>
      {destructiveOf !== null && (
        <Alert tone="error" title="This sync would take most students off the roster">
          {preview.counts.deactivated.toLocaleString()} of {plural(destructiveOf, "student")} on the roster are missing
          from this file and would lose voting eligibility. Make sure this is the complete roster. You'll be asked to
          type SYNC to continue.
        </Alert>
      )}
      <ImportSummaryView summary={preview} />
      {failure && (
        <Alert tone="error" title={failure.title}>
          {failure.message}
        </Alert>
      )}
      <div className="flex flex-col-reverse gap-3 border-t border-hairline pt-6 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onBack} disabled={busy}>
          Back
        </Button>
        <Button
          variant={destructiveOf !== null ? "danger" : "primary"}
          onClick={onImport}
          disabled={n === 0}
          loading={busy}
        >
          Import {plural(n, "student")}
        </Button>
      </div>
    </Panel>
  );
}

function DoneStep({ result, onAgain }: { result: ImportSummary; onAgain: () => void }) {
  return (
    <Panel as="section" padding="lg" aria-labelledby="step-done" className="space-y-8">
      <div className="flex flex-col items-center pt-4 text-center">
        <span className="mb-5 flex size-12 items-center justify-center rounded-full bg-success/10 text-success">
          <CircleCheck className="size-6" strokeWidth={1.5} aria-hidden="true" />
        </span>
        <StepHeading id="step-done">Import complete</StepHeading>
        <p className="mt-1.5 max-w-md text-callout text-ink-2" role="status">
          {result.fileName} was imported with {IMPORT_MODE_LABELS[result.mode].toLowerCase()}.
          {result.issues.length > 0 &&
            ` ${plural(result.issues.length, "issue")} ${result.issues.length === 1 ? "is" : "are"} saved in the import history.`}
        </p>
      </div>
      <ImportCountsGrid summary={result} />
      <div className="flex flex-col-reverse gap-3 border-t border-hairline pt-6 sm:flex-row sm:justify-center">
        <Button variant="secondary" onClick={onAgain}>
          Import another file
        </Button>
        <Button to="/admin/students">View students</Button>
      </div>
    </Panel>
  );
}

function ImportConfirmBody({ preview }: { preview: ImportSummary }) {
  const { counts, mode } = preview;
  const lines = [
    counts.created ? `Add ${plural(counts.created, "new student")}.` : null,
    counts.updated ? `Update ${plural(counts.updated, "existing student")}.` : null,
    mode === "FULL_SYNC" && counts.deactivated
      ? `Mark ${plural(counts.deactivated, "student")} off-roster. They lose voting eligibility but aren't deleted.`
      : null,
    counts.skipped ? `Skip ${plural(counts.skipped, "row")} with errors.` : null,
  ].filter((l): l is string => l !== null);
  return (
    <div className="space-y-4">
      {lines.length > 0 ? (
        <ul className="list-disc space-y-1 pl-5">
          {lines.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      ) : (
        <p>Every student in this file is already up to date.</p>
      )}
      {preview.openElectionWarning && (
        <Alert tone="warning" title="An election is open right now">
          Changes take effect immediately for eligibility.
        </Alert>
      )}
    </div>
  );
}

function ImportFlow() {
  const roster = useRosterImport();
  const { state } = roster;
  const stats = useRosterStats();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const step = stepOf(state);
  const canConfirm =
    state.status === "preview" || state.status === "importing" || (state.status === "error" && state.stage === "commit");
  const [started, setStarted] = useState(false);
  useEffect(() => setStarted(true), []);

  // The confirm dialog stays open (with a spinner) while importing, then closes on any outcome.
  useEffect(() => {
    if (state.status !== "preview" && state.status !== "importing") setConfirmOpen(false);
  }, [state.status]);

  const preview =
    state.status === "preview" || state.status === "importing"
      ? state.preview
      : (state.status === "error" || state.status === "confirmDestructive") && state.preview
        ? state.preview
        : null;

  // The server only guards commits; warn up front when a full sync would remove more than half the roster.
  const onRoster = stats.data?.onRoster;
  const destructiveOf =
    preview && preview.mode === "FULL_SYNC" && onRoster !== undefined && preview.counts.deactivated > onRoster / 2
      ? onRoster
      : null;
  const destructiveDetails = state.status === "confirmDestructive" ? state.details : undefined;

  return (
    <FocusStepContext.Provider value={started}>
      <div className="mb-6">
        <ImportStepper current={step} />
      </div>

      {step === 0 && (
        <ChooseStep
          key="choose"
          file={roster.file}
          fileError={roster.fileError}
          mode={roster.mode}
          busy={state.status === "previewing" || (state.status === "confirmDestructive" && state.stage === "preview")}
          error={state.status === "error" && state.stage === "preview" ? state.error : null}
          onSelect={roster.selectFile}
          onMode={roster.setMode}
          onPreview={() => void roster.preview()}
        />
      )}
      {step === 1 && preview && (
        <PreviewStep
          key="preview"
          preview={preview}
          busy={state.status === "importing"}
          error={state.status === "error" ? state.error : null}
          destructiveOf={destructiveOf}
          onBack={roster.back}
          onImport={() => (destructiveOf !== null ? roster.requestDestructive() : setConfirmOpen(true))}
        />
      )}
      {state.status === "done" && <DoneStep key="done" result={state.result} onAgain={roster.reset} />}

      {preview && (
        <ConfirmDialog
          open={confirmOpen && canConfirm}
          title={`Import ${plural(preview.counts.valid, "student")}?`}
          description={`${preview.fileName} · ${IMPORT_MODE_LABELS[preview.mode]}`}
          confirmLabel="Import"
          loading={state.status === "importing"}
          onConfirm={() => void roster.commit()}
          onCancel={() => setConfirmOpen(false)}
        >
          <ImportConfirmBody preview={preview} />
        </ConfirmDialog>
      )}

      <DestructiveSyncDialog
        open={state.status === "confirmDestructive"}
        offRosterCount={destructiveDetails?.deactivated ?? preview?.counts.deactivated}
        onRosterCount={destructiveDetails?.onRoster ?? onRoster}
        onConfirm={() => void roster.confirmDestructive()}
        onCancel={roster.cancelDestructive}
      />
    </FocusStepContext.Provider>
  );
}

export function AdminStudentImportPage() {
  usePageTitle("Import roster · Admin");
  return (
    <PlatformAdminOnly>
      <PageHeader
        breadcrumb={
          <Link
            to="/admin/students"
            className="-ml-2 inline-flex min-h-11 items-center gap-0.5 rounded-full pr-3 pl-1 text-callout font-medium text-navy-900 transition-colors duration-160 hover:text-navy-600"
          >
            <ChevronLeft className="size-[18px]" aria-hidden="true" /> Students
          </Link>
        }
        title="Import roster"
        description="Upload the registrar's student file to add and update students. You'll review a preview before anything changes."
        className="mb-8 sm:mb-10"
      />
      <ImportFlow />
    </PlatformAdminOnly>
  );
}
