import { useId, type Ref, type SelectHTMLAttributes } from "react";
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
  ref,
  ...rest
}: SelectProps) {
  const autoId = useId();
  const selectId = id ?? autoId;
  const control = (
    <select
      ref={ref}
      id={selectId}
      required={required}
      aria-invalid={error ? true : undefined}
      aria-describedby={describedBy(selectId, hint, error)}
      className={cn(controlClasses(Boolean(error)), "h-10 pr-8", className)}
      {...rest}
    >
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
  if (!label && !hint && !error) return control;
  return (
    <FormField htmlFor={selectId} label={label} hint={hint} error={error} required={required} className={fieldClassName}>
      {control}
    </FormField>
  );
}
