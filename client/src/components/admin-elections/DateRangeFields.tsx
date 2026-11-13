import { Globe } from "lucide-react";
import { Input } from "../ui/Input";
import { timeZoneHint } from "../../utils/datetimeLocal";

interface DateRangeFieldsProps {
  idPrefix: string;
  startsAt: string;
  endsAt: string;
  onChange: (value: { startsAt: string; endsAt: string }) => void;
  errors?: { startsAt?: string; endsAt?: string };
  disabled?: boolean;
  /** Shown instead of the time zone line when disabled. */
  disabledNote?: string;
}

/** Start/end as datetime-local inputs in the viewer's time zone (converted to ISO with offset on save). */
export function DateRangeFields({
  idPrefix,
  startsAt,
  endsAt,
  onChange,
  errors = {},
  disabled,
  disabledNote,
}: DateRangeFieldsProps) {
  return (
    <div className="space-y-2">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          id={`${idPrefix}-starts`}
          type="datetime-local"
          label="Voting opens"
          required
          value={startsAt}
          onChange={(e) => onChange({ startsAt: e.target.value, endsAt })}
          error={errors.startsAt}
          disabled={disabled}
        />
        <Input
          id={`${idPrefix}-ends`}
          type="datetime-local"
          label="Voting closes"
          required
          value={endsAt}
          min={startsAt || undefined}
          onChange={(e) => onChange({ startsAt, endsAt: e.target.value })}
          error={errors.endsAt}
          disabled={disabled}
        />
      </div>
      <p className="flex items-center gap-1.5 text-footnote font-normal text-ink-2">
        <Globe className="size-3.5 shrink-0" aria-hidden="true" />
        {disabled && disabledNote ? disabledNote : `Times are in your time zone: ${timeZoneHint()}.`}
      </p>
    </div>
  );
}
