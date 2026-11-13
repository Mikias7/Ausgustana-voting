import { useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "../../utils/cn";

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "children"> {
  label: ReactNode;
  /** Helper text under the label (linked with aria-describedby). */
  description?: ReactNode;
  className?: string;
}

/** Native checkbox with a label and optional description; the whole row is a 44px target. */
export function Checkbox({ label, description, id, className, disabled, ...rest }: CheckboxProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const descId = `${inputId}-desc`;
  return (
    <div className={cn("flex items-start gap-3", disabled && "opacity-60", className)}>
      <span className="flex h-11 items-center sm:h-6">
        <input
          id={inputId}
          type="checkbox"
          disabled={disabled}
          aria-describedby={description ? descId : undefined}
          className="size-[18px] cursor-pointer rounded-[5px] accent-navy-900 disabled:cursor-not-allowed"
          {...rest}
        />
      </span>
      <span className="flex min-h-11 flex-col justify-center sm:min-h-6">
        <label htmlFor={inputId} className={cn("text-callout font-medium text-ink", !disabled && "cursor-pointer")}>
          {label}
        </label>
        {description && (
          <span id={descId} className="mt-0.5 text-footnote font-normal text-ink-2">
            {description}
          </span>
        )}
      </span>
    </div>
  );
}
