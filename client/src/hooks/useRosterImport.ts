import { useCallback, useEffect, useRef, useState } from "react";
import type { ImportMode, ImportSummary } from "@asa/shared";
import { isApiError } from "../api/client";
import { IMPORT_ERROR_CODES, postRosterImport } from "../api/admin/roster";
import { validateRosterFile } from "../utils/roster";

/** Which request a destructive confirmation or an error belongs to. */
export type ImportStage = "preview" | "commit";

/**
 * idle → previewing → preview → importing → done
 * Any request can end in `error` (with the stage it failed in). A full sync that would take
 * more than half the roster off it pauses in `confirmDestructive` until the admin types SYNC.
 */
export type RosterImportState =
  | { status: "idle" }
  | { status: "previewing" }
  | { status: "preview"; preview: ImportSummary }
  | {
      status: "confirmDestructive";
      stage: ImportStage;
      preview: ImportSummary | null;
      /** From the 400 IMPORT_SYNC_TOO_DESTRUCTIVE fallback, when the server sent them. */
      details?: DestructiveDetails;
    }
  | { status: "importing"; preview: ImportSummary }
  | { status: "done"; result: ImportSummary }
  | { status: "error"; stage: ImportStage; error: unknown; preview: ImportSummary | null };

export interface DestructiveDetails {
  deactivated: number;
  onRoster: number;
}

function destructiveDetails(details: unknown): DestructiveDetails | undefined {
  if (typeof details !== "object" || details === null) return undefined;
  const { deactivated, onRoster } = details as Partial<DestructiveDetails>;
  return typeof deactivated === "number" && typeof onRoster === "number" ? { deactivated, onRoster } : undefined;
}

export interface RosterImport {
  state: RosterImportState;
  file: File | null;
  fileError: string | null;
  mode: ImportMode;
  /** Validates and stores the file (null clears it). Resets any earlier preview. */
  selectFile: (file: File | null) => void;
  setMode: (mode: ImportMode) => void;
  /** Dry run with the chosen file + mode. */
  preview: () => Promise<void>;
  /** Re-uploads the same file for real (the server is stateless). */
  commit: () => Promise<void>;
  /** The preview already shows a sync over the threshold: go straight to the type-SYNC confirmation. */
  requestDestructive: () => void;
  /** Admin typed SYNC: resend the paused request with confirmDestructive=true. */
  confirmDestructive: () => Promise<void>;
  /** Back out of the destructive confirmation. */
  cancelDestructive: () => void;
  /** Preview / error → step 1, keeping the file and mode. */
  back: () => void;
  /** Start over with nothing selected. */
  reset: () => void;
}

export function useRosterImport(): RosterImport {
  const [state, setState] = useState<RosterImportState>({ status: "idle" });
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [mode, setModeState] = useState<ImportMode>("MERGE");

  // Abort in-flight uploads on unmount and ignore stale responses.
  const controllerRef = useRef<AbortController | null>(null);
  useEffect(() => () => controllerRef.current?.abort(), []);

  const selectFile = useCallback((next: File | null) => {
    controllerRef.current?.abort();
    setState({ status: "idle" });
    if (!next) {
      setFile(null);
      setFileError(null);
      return;
    }
    const error = validateRosterFile(next);
    setFileError(error);
    setFile(error ? null : next);
  }, []);

  const setMode = useCallback((next: ImportMode) => {
    setModeState(next);
    setState((s) => (s.status === "error" && s.stage === "preview" ? { status: "idle" } : s));
  }, []);

  const run = useCallback(
    async (stage: ImportStage, preview: ImportSummary | null, confirm: boolean) => {
      if (!file) return;
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      setState(stage === "preview" ? { status: "previewing" } : { status: "importing", preview: preview! });
      try {
        const summary = await postRosterImport(
          { file, mode, dryRun: stage === "preview", confirmDestructive: confirm || undefined },
          controller.signal,
        );
        if (controller.signal.aborted) return;
        setState(stage === "preview" ? { status: "preview", preview: summary } : { status: "done", result: summary });
      } catch (error) {
        if (controller.signal.aborted) return;
        if (!confirm && isApiError(error) && error.code === IMPORT_ERROR_CODES.tooDestructive) {
          setState({ status: "confirmDestructive", stage, preview, details: destructiveDetails(error.details) });
          return;
        }
        setState({ status: "error", stage, error, preview });
      }
    },
    [file, mode],
  );

  const preview = useCallback(() => run("preview", null, false), [run]);

  const commit = useCallback(async () => {
    if (state.status !== "preview" && !(state.status === "error" && state.stage === "commit")) return;
    if (!state.preview) return;
    await run("commit", state.preview, false);
  }, [run, state]);

  const requestDestructive = useCallback(() => {
    setState((s) =>
      s.status === "preview" || (s.status === "error" && s.stage === "commit" && s.preview)
        ? { status: "confirmDestructive", stage: "commit", preview: s.preview }
        : s,
    );
  }, []);

  const confirmDestructive = useCallback(async () => {
    if (state.status !== "confirmDestructive") return;
    if (state.stage === "commit" && state.preview) await run("commit", state.preview, true);
    else await run("preview", null, true);
  }, [run, state]);

  const cancelDestructive = useCallback(() => {
    setState((s) => {
      if (s.status !== "confirmDestructive") return s;
      return s.preview ? { status: "preview", preview: s.preview } : { status: "idle" };
    });
  }, []);

  const back = useCallback(() => {
    controllerRef.current?.abort();
    setState({ status: "idle" });
  }, []);

  const reset = useCallback(() => {
    controllerRef.current?.abort();
    setState({ status: "idle" });
    setFile(null);
    setFileError(null);
    setModeState("MERGE");
  }, []);

  return {
    state,
    file,
    fileError,
    mode,
    selectFile,
    setMode,
    preview,
    commit,
    requestDestructive,
    confirmDestructive,
    cancelDestructive,
    back,
    reset,
  };
}
