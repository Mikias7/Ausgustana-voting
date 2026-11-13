import { useId, type Ref, type TextareaHTMLAttributes } from "react";
import { cn } from "../../utils/cn";
import { controlClasses, describedBy, FormField, type FieldMessageProps } from "./FormField";

export interface TextareaProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "children">,
    FieldMessageProps {
  ref?: Ref<HTMLTextAreaElement>;
  fieldClassName?: string;
}

export function Textarea({ label, hint, error, required, id, className, fieldClassName, rows = 5, ref, ...rest }: TextareaProps) {
  const autoId = useId();
  const textareaId = id ?? autoId;
  const control = (
    <textarea
      ref={ref}
      id={textareaId}
      rows={rows}
      required={required}
      aria-invalid={error ? true : undefined}
      aria-describedby={describedBy(textareaId, hint, error)}
      className={cn(controlClasses(Boolean(error)), "resize-y", className)}
      {...rest}
    />
  );
  if (!label && !hint && !error) return control;
  return (
    <FormField htmlFor={textareaId} label={label} hint={hint} error={error} required={required} className={fieldClassName}>
      {control}
    </FormField>
  );
}
