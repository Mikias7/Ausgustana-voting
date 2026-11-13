import { act, renderHook, waitFor } from "@testing-library/react";
import type { ImportSummary } from "@asa/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../api/client";
import { postRosterImport } from "../api/admin/roster";
import { useRosterImport } from "./useRosterImport";

vi.mock("../api/admin/roster", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../api/admin/roster")>()),
  postRosterImport: vi.fn(),
}));

const post = vi.mocked(postRosterImport);

function summary(overrides: Partial<ImportSummary> = {}): ImportSummary {
  return {
    id: null,
    dryRun: true,
    mode: "MERGE",
    fileName: "roster.txt",
    counts: { valid: 3, created: 2, updated: 1, unchanged: 0, deactivated: 0, skipped: 0, warnings: 0 },
    issues: [],
    openElectionWarning: false,
    createdAt: null,
    uploadedBy: null,
    ...overrides,
  };
}

const file = () => new File(["Doe|Jane|jdoe|jdoe@example.edu|SR"], "roster.txt", { type: "text/plain" });

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe("useRosterImport", () => {
  beforeEach(() => post.mockReset());

  it("goes idle → previewing → preview → importing → done, re-uploading the same file", async () => {
    const { result } = renderHook(() => useRosterImport());
    expect(result.current.state.status).toBe("idle");

    const f = file();
    act(() => result.current.selectFile(f));
    act(() => result.current.setMode("FULL_SYNC"));

    const dry = deferred<ImportSummary>();
    post.mockReturnValueOnce(dry.promise);
    let pending!: Promise<void>;
    act(() => {
      pending = result.current.preview();
    });
    expect(result.current.state.status).toBe("previewing");
    await act(async () => {
      dry.resolve(summary({ mode: "FULL_SYNC" }));
      await pending;
    });
    expect(result.current.state).toMatchObject({ status: "preview", preview: { mode: "FULL_SYNC" } });
    expect(post).toHaveBeenLastCalledWith({ file: f, mode: "FULL_SYNC", dryRun: true, confirmDestructive: undefined }, expect.any(AbortSignal));

    const real = deferred<ImportSummary>();
    post.mockReturnValueOnce(real.promise);
    act(() => {
      pending = result.current.commit();
    });
    expect(result.current.state.status).toBe("importing");
    await act(async () => {
      real.resolve(summary({ id: "imp_1", dryRun: false }));
      await pending;
    });
    expect(result.current.state).toMatchObject({ status: "done", result: { id: "imp_1" } });
    expect(post.mock.calls[1][0]).toMatchObject({ file: f, dryRun: false });
  });

  it("rejects bad files on the client without calling the api", () => {
    const { result } = renderHook(() => useRosterImport());
    act(() => result.current.selectFile(new File(["x"], "roster.xlsx")));
    expect(result.current.file).toBeNull();
    expect(result.current.fileError).toMatch(/\.txt or \.csv/);

    const big = new File(["x"], "big.txt");
    Object.defineProperty(big, "size", { value: 3 * 1024 * 1024 });
    act(() => result.current.selectFile(big));
    expect(result.current.fileError).toMatch(/2 MB/);
    expect(post).not.toHaveBeenCalled();
  });

  it("ends in error (stage preview) when the dry run fails, and back() returns to idle", async () => {
    post.mockRejectedValueOnce(new ApiError(400, "IMPORT_EMPTY", "No valid rows"));
    const { result } = renderHook(() => useRosterImport());
    act(() => result.current.selectFile(file()));
    await act(() => result.current.preview());
    expect(result.current.state).toMatchObject({ status: "error", stage: "preview" });

    act(() => result.current.back());
    expect(result.current.state.status).toBe("idle");
    expect(result.current.file).not.toBeNull();
  });

  it("pauses for a destructive confirmation, then resends with confirmDestructive", async () => {
    const { result } = renderHook(() => useRosterImport());
    act(() => result.current.selectFile(file()));
    act(() => result.current.setMode("FULL_SYNC"));
    post.mockResolvedValueOnce(summary({ mode: "FULL_SYNC" }));
    await act(() => result.current.preview());

    post.mockRejectedValueOnce(new ApiError(400, "IMPORT_SYNC_TOO_DESTRUCTIVE", "Too destructive"));
    await act(() => result.current.commit());
    expect(result.current.state).toMatchObject({ status: "confirmDestructive", stage: "commit" });

    act(() => result.current.cancelDestructive());
    expect(result.current.state.status).toBe("preview");

    post.mockRejectedValueOnce(new ApiError(400, "IMPORT_SYNC_TOO_DESTRUCTIVE", "Too destructive"));
    await act(() => result.current.commit());
    post.mockResolvedValueOnce(summary({ id: "imp_2", dryRun: false, mode: "FULL_SYNC" }));
    await act(() => result.current.confirmDestructive());

    await waitFor(() => expect(result.current.state.status).toBe("done"));
    expect(post.mock.calls.at(-1)![0]).toMatchObject({ dryRun: false, confirmDestructive: true });
  });

  it("requestDestructive() goes straight to the SYNC confirmation and commits with confirmDestructive", async () => {
    const { result } = renderHook(() => useRosterImport());
    act(() => result.current.selectFile(file()));
    act(() => result.current.setMode("FULL_SYNC"));
    post.mockResolvedValueOnce(summary({ mode: "FULL_SYNC" }));
    await act(() => result.current.preview());

    act(() => result.current.requestDestructive());
    expect(result.current.state).toMatchObject({ status: "confirmDestructive", stage: "commit" });
    expect(post).toHaveBeenCalledTimes(1);

    post.mockResolvedValueOnce(summary({ id: "imp_3", dryRun: false, mode: "FULL_SYNC" }));
    await act(() => result.current.confirmDestructive());
    expect(result.current.state.status).toBe("done");
    expect(post.mock.calls[1][0]).toMatchObject({ dryRun: false, confirmDestructive: true });
  });

  it("keeps deactivated/onRoster from the TOO_DESTRUCTIVE fallback", async () => {
    const { result } = renderHook(() => useRosterImport());
    act(() => result.current.selectFile(file()));
    post.mockResolvedValueOnce(summary({ mode: "MERGE" }));
    await act(() => result.current.preview());
    post.mockRejectedValueOnce(
      new ApiError(400, "IMPORT_SYNC_TOO_DESTRUCTIVE", "Too destructive", { deactivated: 9, onRoster: 12, thresholdRatio: 0.5 }),
    );
    await act(() => result.current.commit());
    expect(result.current.state).toMatchObject({ status: "confirmDestructive", details: { deactivated: 9, onRoster: 12 } });
  });

  it("reset() clears the file and returns to merge mode", async () => {
    const { result } = renderHook(() => useRosterImport());
    act(() => result.current.selectFile(file()));
    act(() => result.current.setMode("FULL_SYNC"));
    act(() => result.current.reset());
    expect(result.current).toMatchObject({ file: null, mode: "MERGE", state: { status: "idle" } });
  });
});
