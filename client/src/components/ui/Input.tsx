import { useId, type InputHTMLAttributes, type ReactNode, type Ref } from "react";
import { cn } from "../../utils/cn";
import { controlClasses, describedBy, FormField, type FieldMessageProps } from "./FormField";

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "children">,
    FieldMessageProps {
  ref?: Ref<HTMLInputElement>;
  fieldClassName?: string;
  /** Decorative icon inside the start of the field (e.g. search). */
  leadingIcon?: ReactNode;
}

export function Input({
  label,
  hint,
  error,
  required,
  id,
  className,
  fieldClassName,
  leadingIcon,
  ref,
  ...rest
}: InputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const input = (
    <input
      ref={ref}
      id={inputId}
      required={required}
      aria-invalid={error ? true : undefined}
      aria-describedby={describedBy(inputId, hint, error)}
      className={cn(controlClasses(Boolean(error)), "h-11", Boolean(leadingIcon) && "pl-10", className)}
      {...rest}
    />
  );
  const control = leadingIcon ? (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-3 [&_svg]:size-[18px]">
        {leadingIcon}
      </span>
      {input}
    </div>
  ) : (
    input
  );
  if (!label && !hint && !error) return control;
  return (
    <FormField htmlFor={inputId} label={label} hint={hint} error={error} required={required} className={fieldClassName}>
      {control}
    </FormField>
  );
}
