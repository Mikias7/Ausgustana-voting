import { useId, type FormEvent, type ReactNode } from "react";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";

interface FormSheetProps {
  open: boolean;
  title: ReactNode;
  description?: ReactNode;
  submitLabel: string;
  saving?: boolean;
  onSubmit: () => void;
  onClose: () => void;
  children: ReactNode;
}

/** A form in a Modal (bottom sheet on phones): scrollable fields, Cancel / Save footer. */
export function FormSheet({ open, title, description, submitLabel, saving = false, onSubmit, onClose, children }: FormSheetProps) {
  const formId = useId();
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!saving) onSubmit();
  }
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="lg"
      dismissible={!saving}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form={formId} loading={saving}>
            {submitLabel}
          </Button>
        </>
      }
    >
      <form
        id={formId}
        noValidate
        onSubmit={submit}
        className="-mx-6 max-h-[calc(100dvh-15rem)] space-y-5 overflow-y-auto px-6 py-1 text-ink"
      >
        {children}
      </form>
    </Modal>
  );
}
