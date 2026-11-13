import { useEffect, useRef, useState } from "react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";
import { plural } from "../../utils/roster";

export const DESTRUCTIVE_CONFIRM_WORD = "SYNC";

interface DestructiveSyncDialogProps {
  open: boolean;
  /** Students the sync would mark off-roster, when known from the preview. */
  offRosterCount?: number;
  /** Students currently on the roster, when known. */
  onRosterCount?: number;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Danger confirmation for a full sync that would take more than half the roster off it. Requires typing SYNC. */
export function DestructiveSyncDialog({
  open,
  offRosterCount,
  onRosterCount,
  loading = false,
  onConfirm,
  onCancel,
}: DestructiveSyncDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [typed, setTyped] = useState("");
  const matches = typed.trim() === DESTRUCTIVE_CONFIRM_WORD;

  useEffect(() => {
    if (open) setTyped("");
  }, [open]);

  function close() {
    setTyped("");
    onCancel();
  }

  function confirm() {
    if (matches && !loading) onConfirm();
  }

  return (
    <Modal
      open={open}
      onClose={close}
      size="sm"
      dismissible={!loading}
      initialFocusRef={inputRef}
      title="Take most students off the roster?"
      description={
        offRosterCount !== undefined && onRosterCount !== undefined
          ? `This full sync would mark ${offRosterCount.toLocaleString()} of ${plural(onRosterCount, "student")} on the roster as off-roster.`
          : offRosterCount !== undefined
          ? `This full sync would mark ${plural(offRosterCount, "student")} off-roster, more than half of everyone on it.`
          : "This full sync would mark more than half of the current roster off-roster."
      }
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={loading}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirm} disabled={!matches} loading={loading}>
            Sync anyway
          </Button>
        </>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          confirm();
        }}
      >
        <p>
          They lose voting eligibility right away. Nobody is deleted, and importing a complete file later puts them
          back. Make sure this is the full roster, not a partial list.
        </p>
        <Input
          ref={inputRef}
          label={
            <>
              Type <span className="font-semibold">{DESTRUCTIVE_CONFIRM_WORD}</span> to confirm
            </>
          }
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          disabled={loading}
        />
      </form>
    </Modal>
  );
}
