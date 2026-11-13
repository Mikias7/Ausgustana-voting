import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { electionInputSchema, type EligibilityRule } from "@asa/shared";
import { createElection } from "../../api/admin/elections";
import { BackLink, PanelTitle } from "../../components/admin-elections/AdminBits";
import { DateRangeFields } from "../../components/admin-elections/DateRangeFields";
import { EligibilityRuleEditor } from "../../components/admin-elections/EligibilityRuleEditor";
import {
  DEFAULT_RESULTS_SETTINGS,
  ResultsSettingsFields,
  type ResultsSettingsValue,
} from "../../components/admin-elections/ResultsSettingsFields";
import { Alert } from "../../components/ui/Alert";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { Input } from "../../components/ui/Input";
import { LoadingState } from "../../components/ui/LoadingState";
import { PageHeader } from "../../components/ui/PageHeader";
import { Panel } from "../../components/ui/Panel";
import { Select } from "../../components/ui/Select";
import { Textarea } from "../../components/ui/Textarea";
import { useManagedOrganizations } from "../../hooks/useAdminElections";
import { usePageTitle } from "../../hooks/usePageTitle";
import { useVoterLists } from "../../hooks/useVoterLists";
import { ELECTION_FRIENDLY_ERRORS, describeAdminError, eligibilityProblem } from "../../utils/adminElections";
import { defaultElectionWindow, localInputToIso } from "../../utils/datetimeLocal";
import { fieldErrorsFromApiError, fieldErrorsFromIssues, hasErrors, type FieldErrors } from "../../utils/formErrors";

export function AdminElectionNewPage() {
  usePageTitle("New election · Admin");
  const navigate = useNavigate();
  const orgs = useManagedOrganizations();
  const [organizationId, setOrganizationId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dates, setDates] = useState(() => defaultElectionWindow());
  const [eligibility, setEligibility] = useState<EligibilityRule>({ type: "ALL_STUDENTS" });
  const [results, setResults] = useState<ResultsSettingsValue>(DEFAULT_RESULTS_SETTINGS);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<{ title: string; message: string } | null>(null);
  const [saving, setSaving] = useState(false);

  // One organization: pick it. Several: prefer ASA's.
  useEffect(() => {
    if (organizationId || !orgs.data?.length) return;
    const asa = orgs.data.find((o) => o.slug === "asa");
    setOrganizationId(orgs.data.length === 1 ? orgs.data[0].id : (asa?.id ?? ""));
  }, [orgs.data, organizationId]);

  const org = orgs.data?.find((o) => o.id === organizationId);
  const voterLists = useVoterLists(org?.slug, { enabled: Boolean(org) });

  const clear = (key: string) => setErrors((e) => ({ ...e, [key]: undefined }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    const startsAt = localInputToIso(dates.startsAt);
    const endsAt = localInputToIso(dates.endsAt);
    const parsed = electionInputSchema.safeParse({
      organizationId,
      title,
      description: description.trim() || null,
      startsAt: startsAt ?? "",
      endsAt: endsAt ?? "",
      eligibility,
      ...results,
    });
    const next: FieldErrors = parsed.success ? {} : fieldErrorsFromIssues(parsed.error.issues, ELECTION_FRIENDLY_ERRORS);
    const ruleProblem = eligibilityProblem(eligibility);
    if (ruleProblem) next.eligibility = ruleProblem;
    if (!parsed.success || ruleProblem) {
      setErrors(next);
      setFormError({ title: "Check the highlighted fields", message: "Some details need fixing before the draft can be created." });
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const created = await createElection(parsed.data);
      navigate(`/admin/elections/${created.id}?tab=positions`, { replace: true });
    } catch (error) {
      const fieldErrors = fieldErrorsFromApiError(error);
      if (hasErrors(fieldErrors)) setErrors(fieldErrors);
      setFormError(describeAdminError(error, "We couldn't create the election"));
      setSaving(false);
    }
  }

  const header = (
    <PageHeader
      breadcrumb={<BackLink to="/admin/elections" label="Elections" />}
      title="New election"
      description="Start with the basics. You'll add positions and candidates next; nothing is visible to students until you publish."
      className="mb-8 sm:mb-10"
    />
  );

  if (orgs.error && !orgs.data) {
    return (
      <>
        {header}
        <ErrorState title="We couldn't load your organizations" error={orgs.error} onRetry={orgs.reload} />
      </>
    );
  }
  if (!orgs.data) {
    return (
      <>
        {header}
        <LoadingState label="Loading…" />
      </>
    );
  }
  if (orgs.data.length === 0) {
    return (
      <>
        {header}
        <EmptyState
          title="No organizations to manage"
          description="You can create elections once ASA gives you an admin role for an organization."
          action={
            <Button to="/admin" variant="secondary">
              Back to dashboard
            </Button>
          }
        />
      </>
    );
  }

  return (
    <>
      {header}
      <form noValidate onSubmit={submit} className="max-w-[720px] space-y-6">
        {formError && (
          <Alert tone="error" title={formError.title}>
            {formError.message}
          </Alert>
        )}
        <Panel as="section" aria-labelledby="new-basics">
          <PanelTitle id="new-basics" title="Basics" />
          <div className="space-y-5">
            {orgs.data.length > 1 ? (
              <Select
                id="new-org"
                label="Organization"
                required
                placeholder="Choose an organization"
                options={orgs.data.map((o) => ({ value: o.id, label: o.name }))}
                value={organizationId}
                onChange={(e) => {
                  setOrganizationId(e.target.value);
                  setEligibility((rule) => (rule.type === "VOTER_LIST" ? { type: "VOTER_LIST", listId: "" } : rule));
                  clear("organizationId");
                }}
                error={errors.organizationId}
              />
            ) : (
              <div className="flex flex-col gap-1">
                <p className="text-footnote text-ink">Organization</p>
                <p className="text-body text-ink">{orgs.data[0].name}</p>
              </div>
            )}
            <Input
              id="new-title"
              label="Title"
              required
              placeholder="e.g. ASA General Election 2027"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                clear("title");
              }}
              error={errors.title}
              maxLength={150}
            />
            <Textarea
              id="new-desc"
              label="Description"
              hint="Optional. Shown to students on the election page."
              rows={4}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                clear("description");
              }}
              error={errors.description}
              maxLength={4000}
            />
          </div>
        </Panel>

        <Panel as="section" aria-labelledby="new-schedule">
          <PanelTitle
            id="new-schedule"
            title="Schedule"
            description="Voting opens and closes automatically at these times once the election is published."
          />
          <DateRangeFields
            idPrefix="new"
            startsAt={dates.startsAt}
            endsAt={dates.endsAt}
            onChange={(value) => {
              setDates(value);
              clear("startsAt");
              clear("endsAt");
            }}
            errors={{ startsAt: errors.startsAt, endsAt: errors.endsAt }}
          />
        </Panel>

        <Panel as="section" aria-labelledby="new-eligibility">
          <PanelTitle
            id="new-eligibility"
            title="Who can vote"
            description="Applies to the whole election. You can narrow individual positions later."
          />
          <EligibilityRuleEditor
            id="new-elig"
            legend={<span className="sr-only">Who can vote</span>}
            value={eligibility}
            onChange={(rule) => {
              setEligibility(rule);
              clear("eligibility");
            }}
            voterLists={voterLists.data}
            voterListsLoading={Boolean(org) && voterLists.loading}
            error={errors.eligibility}
          />
        </Panel>

        <Panel as="section" aria-labelledby="new-results">
          <PanelTitle id="new-results" title="Results" description="You can change these later, even while voting is open." />
          <ResultsSettingsFields name="new-results" value={results} onChange={setResults} />
        </Panel>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button to="/admin/elections" variant="secondary">
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            Create draft
          </Button>
        </div>
      </form>
    </>
  );
}
