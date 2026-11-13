import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "../../utils/cn";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
  /** Prevent closing with Esc / backdrop (e.g. while a request is in flight). */
  dismissible?: boolean;
  /** Element to focus first; defaults to the first focusable element in the dialog. */
  initialFocusRef?: RefObject<HTMLElement | null>;
}

const sizes = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl" } as const;

/**
 * Accessible modal dialog: role="dialog", aria-modal, labelled by its title.
 * Moves focus inside on open, traps Tab, closes on Esc / backdrop click,
 * restores focus to the previously focused element on close, and locks page scroll.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  dismissible = true,
  initialFocusRef,
}: ModalProps) {
  const titleId = useId();
  const descId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    const target =
      initialFocusRef?.current ?? panelRef.current?.querySelector<HTMLElement>(FOCUSABLE) ?? panelRef.current;
    target?.focus();

    return () => {
      document.body.style.overflow = overflow;
      previouslyFocused?.focus?.();
    };
  }, [open, initialFocusRef]);

  if (!open) return null;

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape" && dismissible) {
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== "Tab" || !panelRef.current) return;
    const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center" onKeyDown={onKeyDown}>
      <div
        className="absolute inset-0 animate-fade-in bg-augie-blue-950/50 backdrop-blur-[2px]"
        aria-hidden="true"
        onClick={dismissible ? onClose : undefined}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={cn(
          "relative w-full animate-scale-in rounded-2xl bg-white shadow-xl ring-1 ring-slate-900/5",
          sizes[size],
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 pt-5 pb-4">
          <div>
            <h2 id={titleId} className="text-xl font-semibold">
              {title}
            </h2>
            {description && (
              <p id={descId} className="mt-1 text-sm text-slate-600">
                {description}
              </p>
            )}
          </div>
          {dismissible && (
            <button
              type="button"
              onClick={onClose}
              className="-mr-2 rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              aria-label="Close dialog"
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          )}
        </div>
        {children && <div className="px-6 py-5 text-sm text-slate-700">{children}</div>}
        {footer && (
          <div className="flex flex-col-reverse gap-2 rounded-b-2xl border-t border-slate-100 bg-slate-50 px-6 py-4 sm:flex-row sm:justify-end">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
