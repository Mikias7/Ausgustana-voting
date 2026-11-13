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

/** Label + control + hint + error. Input/Select/Textarea use it automatically when given `label`. */
export function FormField({ htmlFor, label, hint, error, required, className, children }: FormFieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label htmlFor={htmlFor} className="text-sm font-semibold text-slate-800">
          {label}
          {required && (
            <span className="ml-0.5 text-red-700" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}
      {children}
      {hint && !error && (
        <p id={hintId(htmlFor)} className="text-xs text-slate-600">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId(htmlFor)} className="text-xs font-medium text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

export const controlClasses = (invalid: boolean) =>
  cn(
    "block w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 shadow-sm",
    "placeholder:text-slate-400 transition-colors",
    "focus:border-augie-blue-500 focus:outline-none focus:ring-3 focus:ring-augie-blue-500/20",
    "disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500",
    invalid ? "border-red-500" : "border-slate-300 hover:border-slate-400",
  );
