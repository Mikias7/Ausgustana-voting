import { useId, type Ref, type SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../../utils/cn";
import { controlClasses, describedBy, FormField, type FieldMessageProps } from "./FormField";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "children">,
    FieldMessageProps {
  options: ReadonlyArray<SelectOption>;
  placeholder?: string;
  ref?: Ref<HTMLSelectElement>;
  fieldClassName?: string;
  /** "quiet": compact pill for toolbars (pass `aria-label` when there is no visible label). */
  appearance?: "field" | "quiet";
}

export function Select({
  label,
  hint,
  error,
  required,
  id,
  options,
  placeholder,
  className,
  fieldClassName,
  appearance = "field",
  ref,
  ...rest
}: SelectProps) {
  const autoId = useId();
  const selectId = id ?? autoId;
  const quiet = appearance === "quiet";
  const control = (
    <div className={cn("relative", quiet && "block sm:inline-block")}>
      <select
        ref={ref}
        id={selectId}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(selectId, hint, error)}
        className={cn(
          "cursor-pointer appearance-none",
          quiet
            ? "h-11 w-full rounded-full border border-transparent bg-inset pr-10 pl-4 text-callout font-medium text-ink transition-colors duration-160 hover:bg-navy-50 sm:h-9"
            : cn(controlClasses(Boolean(error)), "h-11 pr-10"),
          className,
        )}
        {...rest}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-ink-2"
        aria-hidden="true"
      />
    </div>
  );
  if (!label && !hint && !error) return control;
  return (
    <FormField htmlFor={selectId} label={label} hint={hint} error={error} required={required} className={fieldClassName}>
      {control}
    </FormField>
  );
}
