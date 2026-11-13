import type { ReactNode } from "react";
import { cn } from "../../utils/cn";

export interface FieldMessageProps {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
}

interface FormFieldProps extends FieldMessageProps {
  /** id of the control this field labels. */
  htmlFor: string;
  className?: string;
  children: ReactNode;
}

export const hintId = (id: string) => `${id}-hint`;
export const errorId = (id: string) => `${id}-error`;

/** aria-describedby value for a control inside a FormField. */
export function describedBy(id: string, hint?: ReactNode, error?: ReactNode): string | undefined {
  const ids = [hint ? hintId(id) : null, error ? errorId(id) : null].filter(Boolean);
  return ids.length ? ids.join(" ") : undefined;
}

/** Label (13px/500) above the control, then hint or error. Input/Select/Textarea use it when given `label`. */
export function FormField({ htmlFor, label, hint, error, required, className, children }: FormFieldProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {label && (
        <label htmlFor={htmlFor} className="text-footnote text-ink">
          {label}
          {required && (
            <span className="ml-0.5 text-ink-2" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}
      {children}
      {hint && !error && (
        <p id={hintId(htmlFor)} className="text-footnote font-normal text-ink-2">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId(htmlFor)} className="text-footnote text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

/** Inset fill, no border until focus; 12px radius. Height is set by each control. */
export const controlClasses = (invalid: boolean) =>
  cn(
    "block w-full rounded-input border bg-inset px-3.5 text-body text-ink",
    "placeholder:text-ink-3 transition-[background-color,border-color] duration-160 ease-apple",
    "hover:bg-navy-50 focus:border-hairline-strong focus:bg-surface",
    "disabled:cursor-not-allowed disabled:opacity-60",
    invalid ? "border-danger bg-danger/5" : "border-transparent",
  );
