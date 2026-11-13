import { useId, type InputHTMLAttributes, type Ref } from "react";
import { cn } from "../../utils/cn";
import { controlClasses, describedBy, FormField, type FieldMessageProps } from "./FormField";

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "children">,
    FieldMessageProps {
  ref?: Ref<HTMLInputElement>;
  fieldClassName?: string;
}

export function Input({ label, hint, error, required, id, className, fieldClassName, ref, ...rest }: InputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const control = (
    <input
      ref={ref}
      id={inputId}
      required={required}
      aria-invalid={error ? true : undefined}
      aria-describedby={describedBy(inputId, hint, error)}
      className={cn(controlClasses(Boolean(error)), "h-10", className)}
      {...rest}
    />
  );
  if (!label && !hint && !error) return control;
  return (
    <FormField htmlFor={inputId} label={label} hint={hint} error={error} required={required} className={fieldClassName}>
      {control}
    </FormField>
  );
}
