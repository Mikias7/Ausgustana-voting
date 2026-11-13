import { useEffect, useId, useState } from "react";
import type { AdminPosition, PositionInput, VoterListSummary, VotingMethod } from "@asa/shared";
import { Alert } from "../ui/Alert";
import { Checkbox } from "../ui/Checkbox";
import { Input } from "../ui/Input";
import { SegmentedControl } from "../ui/SegmentedControl";
import { TabPanel } from "../ui/TabPanel";
import { Textarea } from "../ui/Textarea";
import { describeAdminError, positionFormFrom, validatePositionForm, type PositionFormValues } from "../../utils/adminElections";
import { fieldErrorsFromApiError, hasErrors, type FieldErrors } from "../../utils/formErrors";
import { EligibilityRuleEditor } from "./EligibilityRuleEditor";
import { FormSheet } from "./FormSheet";

const METHODS: Array<{ id: VotingMethod; label: string }> = [
  { id: "SINGLE_CHOICE", label: "Single choice" },
  { id: "MULTIPLE_CHOICE", label: "Multiple choice" },
];

interface PositionFormSheetProps {
  open: boolean;
  /** Editing this position; undefined to add a new one. */
  position?: AdminPosition;
  voterLists?: VoterListSummary[];
  voterListsLoading?: boolean;
  onSubmit: (input: PositionInput) => Promise<void>;
  onClose: () => void;
}

/** Add / edit a position. Validates with the shared zod schema; single choice always means one selection. */
export function PositionFormSheet({
  open,
  position,
  voterLists,
  voterListsLoading,
  onSubmit,
  onClose,
}: PositionFormSheetProps) {
  const baseId = useId();
  const [values, setValues] = useState<PositionFormValues>(() => positionFormFrom(position));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<{ title: string; message: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setValues(positionFormFrom(position));
    setErrors({});
    setFormError(null);
  }, [open, position]);

  const set = <K extends keyof PositionFormValues>(key: K, value: PositionFormValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  function setMethod(method: VotingMethod) {
    setValues((v) => ({
      ...v,
      votingMethod: method,
      // Single choice: exactly one. Multiple: start at the number of seats.
      maxSelections: method === "SINGLE_CHOICE" ? "1" : v.maxSelections === "1" ? v.seats : v.maxSelections,
    }));
    setErrors((e) => ({ ...e, maxSelections: undefined }));
  }

  async function submit() {
    const result = validatePositionForm(values);
    if (!result.ok) {
      setErrors(result.errors);
      setFormError(null);
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await onSubmit(result.data);
      onClose();
    } catch (error) {
      const fieldErrors = fieldErrorsFromApiError(error);
      if (hasErrors(fieldErrors)) setErrors(fieldErrors);
      else setFormError(describeAdminError(error, "We couldn't save this position"));
    } finally {
      setSaving(false);
    }
  }

  const single = values.votingMethod === "SINGLE_CHOICE";
  const methodTabs = `${baseId}-method`;

  return (
    <FormSheet
      open={open}
      title={position ? "Edit position" : "Add position"}
      submitLabel={position ? "Save position" : "Add position"}
      saving={saving}
      onSubmit={submit}
      onClose={onClose}
    >
      {formError && (
        <Alert tone="error" title={formError.title}>
          {formError.message}
        </Alert>
      )}
      <Input
        id={`${baseId}-title`}
        label="Title"
        required
        placeholder="e.g. President"
        value={values.title}
        onChange={(e) => set("title", e.target.value)}
        error={errors.title}
        maxLength={120}
      />
      <Textarea
        id={`${baseId}-desc`}
        label="Description"
        hint="Optional. What this role does, shown to voters."
        rows={3}
        value={values.description}
        onChange={(e) => set("description", e.target.value)}
        error={errors.description}
        maxLength={2000}
      />
      <div className="flex flex-col gap-2">
        <p className="text-footnote text-ink" id={`${methodTabs}-label`}>
          Voting method
        </p>
        <SegmentedControl
          id={methodTabs}
          label="Voting method"
          items={METHODS}
          value={values.votingMethod}
          onChange={setMethod}
          className="w-full sm:w-auto sm:self-start"
        />
        <TabPanel tabsId={methodTabs} value={values.votingMethod} className="text-footnote font-normal text-ink-2">
          {single
            ? "Each voter picks one candidate."
            : "Each voter can pick several candidates, up to the maximum below."}
        </TabPanel>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          id={`${baseId}-seats`}
          type="number"
          inputMode="numeric"
          min={1}
          max={20}
          label="Seats"
          hint="How many people win."
          value={values.seats}
          onChange={(e) => set("seats", e.target.value)}
          error={errors.seats}
        />
        <Input
          id={`${baseId}-max`}
          type="number"
          inputMode="numeric"
          min={1}
          max={20}
          label="Choices per voter"
          hint={single ? "Always 1 for single choice." : "The most candidates one voter can pick."}
          value={single ? "1" : values.maxSelections}
          disabled={single}
          onChange={(e) => set("maxSelections", e.target.value)}
          error={errors.maxSelections}
        />
      </div>
      <div className="space-y-1">
        <Checkbox
          label="Allow abstaining"
          description="Voters can skip this position on purpose."
          checked={values.allowAbstain}
          onChange={(e) => set("allowAbstain", e.target.checked)}
        />
        <Checkbox
          label="Allow write-in candidates"
          description="Voters can type in a name that isn't on the ballot."
          checked={values.allowWriteIn}
          onChange={(e) => set("allowWriteIn", e.target.checked)}
        />
      </div>
      <EligibilityRuleEditor
        id={`${baseId}-elig`}
        legend="Who can vote for this position"
        value={values.eligibility}
        onChange={(rule) => set("eligibility", rule)}
        voterLists={voterLists}
        voterListsLoading={voterListsLoading}
        error={errors.eligibility}
      />
    </FormSheet>
  );
}
