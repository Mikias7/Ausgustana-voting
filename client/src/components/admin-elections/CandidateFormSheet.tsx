import { useEffect, useId, useState } from "react";
import { candidateInputSchema, type AdminCandidate, type CandidateInput } from "@asa/shared";
import { Alert } from "../ui/Alert";
import { Avatar } from "../ui/Avatar";
import { Input } from "../ui/Input";
import { Textarea } from "../ui/Textarea";
import { describeAdminError } from "../../utils/adminElections";
import { fieldErrorsFromApiError, fieldErrorsFromIssues, hasErrors, type FieldErrors } from "../../utils/formErrors";
import { FormSheet } from "./FormSheet";

const FRIENDLY = {
  name: "Enter a name between 2 and 120 characters.",
  bio: "Keep the statement under 1,000 characters.",
  photoUrl: "Enter a full image URL starting with https://, or leave it empty.",
};

interface CandidateFormSheetProps {
  open: boolean;
  positionTitle: string;
  candidate?: AdminCandidate;
  onSubmit: (input: CandidateInput) => Promise<void>;
  onClose: () => void;
}

export function CandidateFormSheet({ open, positionTitle, candidate, onSubmit, onClose }: CandidateFormSheetProps) {
  const baseId = useId();
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<{ title: string; message: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(candidate?.name ?? "");
    setBio(candidate?.bio ?? "");
    setPhotoUrl(candidate?.photoUrl ?? "");
    setErrors({});
    setFormError(null);
  }, [open, candidate]);

  async function submit() {
    const parsed = candidateInputSchema.safeParse({
      name,
      bio: bio.trim() || null,
      photoUrl: photoUrl.trim() || null,
    });
    if (!parsed.success) {
      setErrors(fieldErrorsFromIssues(parsed.error.issues, FRIENDLY));
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await onSubmit(parsed.data);
      onClose();
    } catch (error) {
      const fieldErrors = fieldErrorsFromApiError(error);
      if (hasErrors(fieldErrors)) setErrors(fieldErrors);
      else setFormError(describeAdminError(error, "We couldn't save this candidate"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormSheet
      open={open}
      title={candidate ? "Edit candidate" : "Add candidate"}
      description={positionTitle}
      submitLabel={candidate ? "Save candidate" : "Add candidate"}
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
        id={`${baseId}-name`}
        label="Name"
        required
        autoComplete="off"
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          setErrors((er) => ({ ...er, name: undefined }));
        }}
        error={errors.name}
        maxLength={120}
      />
      <Textarea
        id={`${baseId}-bio`}
        label="Statement"
        hint="Optional. A short statement voters see on the ballot."
        rows={4}
        value={bio}
        onChange={(e) => {
          setBio(e.target.value);
          setErrors((er) => ({ ...er, bio: undefined }));
        }}
        error={errors.bio}
        maxLength={1000}
      />
      <div className="flex items-start gap-4">
        <Input
          id={`${baseId}-photo`}
          type="url"
          inputMode="url"
          label="Photo URL"
          hint="Optional. Initials are shown when there's no photo."
          placeholder="https://"
          value={photoUrl}
          onChange={(e) => {
            setPhotoUrl(e.target.value);
            setErrors((er) => ({ ...er, photoUrl: undefined }));
          }}
          error={errors.photoUrl}
          fieldClassName="flex-1"
        />
        <Avatar
          key={photoUrl}
          name={name || "?"}
          src={/^https?:\/\//.test(photoUrl.trim()) ? photoUrl.trim() : null}
          size="lg"
          className="mt-7"
        />
      </div>
    </FormSheet>
  );
}
