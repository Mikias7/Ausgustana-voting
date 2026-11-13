import { useId, type ReactNode } from "react";
import { cn } from "../../utils/cn";

export interface RadioCardOption<T extends string> {
  value: T;
  label: string;
  description?: ReactNode;
}

interface RadioCardGroupProps<T extends string> {
  legend: ReactNode;
  name: string;
  options: ReadonlyArray<RadioCardOption<T>>;
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  className?: string;
}

/** Native radio group rendered as a grouped list of selectable rows with plain-language descriptions. */
export function RadioCardGroup<T extends string>({
  legend,
  name,
  options,
  value,
  onChange,
  disabled,
  className,
}: RadioCardGroupProps<T>) {
  const baseId = useId();
  return (
    <fieldset className={cn("min-w-0", className)} disabled={disabled}>
      <legend className="mb-2 text-footnote text-ink">{legend}</legend>
      <div className="overflow-hidden rounded-row border border-hairline bg-surface">
        {options.map((option, i) => {
          const id = `${baseId}-${option.value}`;
          const selected = option.value === value;
          return (
            <label
              key={option.value}
              htmlFor={id}
              className={cn(
                "flex items-start gap-3 px-4 py-3 transition-colors duration-160",
                i > 0 && "border-t border-hairline",
                disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-inset/70",
                selected && "bg-navy-50/70",
              )}
            >
              <input
                id={id}
                type="radio"
                name={name}
                value={option.value}
                checked={selected}
                onChange={() => onChange(option.value)}
                aria-describedby={option.description ? `${id}-desc` : undefined}
                className="mt-[3px] size-[18px] shrink-0 accent-navy-900"
              />
              <span className="min-w-0">
                <span className="block text-callout font-medium text-ink">{option.label}</span>
                {option.description && (
                  <span id={`${id}-desc`} className="mt-0.5 block text-footnote font-normal text-ink-2">
                    {option.description}
                  </span>
                )}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
