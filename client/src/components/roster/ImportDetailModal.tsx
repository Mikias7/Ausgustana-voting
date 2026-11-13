import { useImportDetail } from "../../hooks/useRoster";
import { ErrorState } from "../ui/ErrorState";
import { Modal } from "../ui/Modal";
import { Skeleton } from "../ui/Skeleton";
import { ImportSummaryView } from "./ImportSummaryView";

interface ImportDetailModalProps {
  /** Import to show; null closes the dialog. */
  id: string | null;
  onClose: () => void;
}

/** Full ImportSummary of a past import, reusing the preview summary. */
export function ImportDetailModal({ id, onClose }: ImportDetailModalProps) {
  const { data, loading, error, reload } = useImportDetail(id);
  return (
    <Modal open={id !== null} onClose={onClose} size="lg" title="Import summary">
      <div className="max-h-[70vh] overflow-y-auto pr-1">
        {error ? (
          <ErrorState compact error={error} onRetry={reload} />
        ) : !data || loading ? (
          <div className="space-y-6" aria-busy="true">
            <span className="sr-only" role="status">
              Loading import…
            </span>
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-28 w-full rounded-row" />
            <Skeleton className="h-40 w-full rounded-row" />
          </div>
        ) : (
          <ImportSummaryView summary={data} showOpenElectionWarning={false} />
        )}
      </div>
    </Modal>
  );
}
