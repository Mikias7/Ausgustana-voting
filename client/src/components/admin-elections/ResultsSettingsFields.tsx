import type { ResultsRelease, ResultsVisibility } from "@asa/shared";
import { Checkbox } from "../ui/Checkbox";
import { RadioCardGroup, type RadioCardOption } from "./RadioCardGroup";

export interface ResultsSettingsValue {
  resultsVisibility: ResultsVisibility;
  resultsRelease: ResultsRelease;
  showTurnout: boolean;
}

export const DEFAULT_RESULTS_SETTINGS: ResultsSettingsValue = {
  resultsVisibility: "PUBLIC",
  resultsRelease: "AUTOMATIC",
  showTurnout: true,
};

const VISIBILITY: RadioCardOption<ResultsVisibility>[] = [
  { value: "PUBLIC", label: "Everyone", description: "Results appear on the public site, no sign-in needed." },
  { value: "STUDENTS", label: "Signed-in students", description: "Students must sign in to see the results." },
  {
    value: "ADMINS_ONLY",
    label: "Admins only",
    description: "Only this organization's admins see the results. Students just see that voting closed.",
  },
];

const RELEASE: RadioCardOption<ResultsRelease>[] = [
  { value: "AUTOMATIC", label: "As soon as voting closes", description: "Results are released automatically." },
  {
    value: "MANUAL",
    label: "When an admin releases them",
    description: "Gives you time to review results before anyone else sees them.",
  },
];

interface ResultsSettingsFieldsProps {
  name: string;
  value: ResultsSettingsValue;
  onChange: (value: ResultsSettingsValue) => void;
  disabled?: boolean;
}

/** Who sees results, when they're released and whether turnout is shown — in plain language. */
export function ResultsSettingsFields({ name, value, onChange, disabled }: ResultsSettingsFieldsProps) {
  return (
    <div className="space-y-6">
      <RadioCardGroup
        legend="Who can see the results"
        name={`${name}-visibility`}
        options={VISIBILITY}
        value={value.resultsVisibility}
        onChange={(resultsVisibility) => onChange({ ...value, resultsVisibility })}
        disabled={disabled}
      />
      <RadioCardGroup
        legend="When results are released"
        name={`${name}-release`}
        options={RELEASE}
        value={value.resultsRelease}
        onChange={(resultsRelease) => onChange({ ...value, resultsRelease })}
        disabled={disabled}
      />
      <Checkbox
        label="Show turnout"
        description="Show how many eligible students voted alongside the results. Individual votes are never shown."
        checked={value.showTurnout}
        onChange={(e) => onChange({ ...value, showTurnout: e.target.checked })}
        disabled={disabled}
      />
    </div>
  );
}
