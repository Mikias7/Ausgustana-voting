import { useId, useRef, useState, type DragEvent } from "react";
import { FileText, Upload, X } from "lucide-react";
import { Button } from "../ui/Button";
import { cn } from "../../utils/cn";
import { formatBytes, ROSTER_ACCEPT } from "../../utils/roster";

interface RosterFileDropProps {
  file: File | null;
  error: string | null;
  onSelect: (file: File | null) => void;
  disabled?: boolean;
}

/** Drag-and-drop zone plus a "Choose file" button. Once chosen, shows the file's name and size. */
export function RosterFileDrop({ file, error, onSelect, disabled = false }: RosterFileDropProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const hintId = useId();
  const errorId = useId();
  const [dragging, setDragging] = useState(false);

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    if (disabled) return;
    const dropped = event.dataTransfer.files?.[0];
    if (dropped) onSelect(dropped);
  }

  const choose = () => inputRef.current?.click();
  const input = (
    <input
      ref={inputRef}
      type="file"
      accept={ROSTER_ACCEPT}
      className="sr-only"
      tabIndex={-1}
      aria-hidden="true"
      data-testid="roster-file-input"
      disabled={disabled}
      onChange={(e) => {
        onSelect(e.target.files?.[0] ?? null);
        e.target.value = ""; // allow choosing the same file again
      }}
    />
  );

  return (
    <div>
      {file ? (
        <div className="flex items-center gap-3.5 rounded-row border border-hairline bg-surface py-2.5 pr-2 pl-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-navy-50 text-navy-900">
            <FileText className="size-5" strokeWidth={1.5} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-body font-medium text-ink">{file.name}</p>
            <p className="text-footnote font-normal text-ink-2 tabular">{formatBytes(file.size)}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={choose} disabled={disabled}>
            Replace
          </Button>
          <button
            type="button"
            onClick={() => onSelect(null)}
            disabled={disabled}
            className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-ink-2 transition-colors duration-160 hover:bg-inset hover:text-ink disabled:opacity-50 sm:size-9"
            aria-label={`Remove ${file.name}`}
          >
            <X className="size-[18px]" aria-hidden="true" />
          </button>
          {input}
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            "flex flex-col items-center rounded-row border border-dashed px-6 py-10 text-center transition-colors duration-160",
            dragging ? "border-navy-400 bg-navy-50" : "border-hairline-strong bg-inset/60",
            error && !dragging && "border-danger/60",
          )}
        >
          <span className="mb-4 flex size-12 items-center justify-center rounded-full bg-navy-50 text-navy-900">
            <Upload className="size-6" strokeWidth={1.5} aria-hidden="true" />
          </span>
          <p className="text-title-3">Drag your roster file here</p>
          <p id={hintId} className="mt-1 text-callout text-ink-2">
            .txt or .csv, up to 2 MB
          </p>
          <Button
            variant="secondary"
            size="sm"
            className="mt-5"
            onClick={choose}
            disabled={disabled}
            aria-describedby={error ? `${hintId} ${errorId}` : hintId}
          >
            Choose file
          </Button>
          {input}
        </div>
      )}
      {error && (
        <p id={errorId} role="alert" className="mt-2.5 px-1 text-footnote text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
