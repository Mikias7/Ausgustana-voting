import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ListChecks, Plus } from "lucide-react";
import { voterListInputSchema } from "@asa/shared";
import { createVoterList } from "../../api/admin/voterLists";
import { FormSheet } from "../../components/admin-elections/FormSheet";
import { Alert } from "../../components/ui/Alert";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { GroupedList } from "../../components/ui/GroupedList";
import { Input } from "../../components/ui/Input";
import { ListRow } from "../../components/ui/ListRow";
import { ListRowSkeleton } from "../../components/ui/ListRowSkeleton";
import { PageHeader } from "../../components/ui/PageHeader";
import { Select } from "../../components/ui/Select";
import { useManagedOrganizations } from "../../hooks/useAdminElections";
import { usePageTitle } from "../../hooks/usePageTitle";
import { useSearchParamState } from "../../hooks/useSearchParamState";
import { useVoterLists } from "../../hooks/useVoterLists";
import { describeAdminError, plural } from "../../utils/adminElections";
import { fieldErrorsFromApiError, fieldErrorsFromIssues, hasErrors, type FieldErrors } from "../../utils/formErrors";
import type { ManagedOrganization } from "@asa/shared";

function NewListSheet({
  open,
  orgs,
  defaultOrgId,
  onClose,
}: {
  open: boolean;
  orgs: ManagedOrganization[];
  defaultOrgId: string;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [organizationId, setOrganizationId] = useState(defaultOrgId);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<{ title: string; message: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName("");
    setOrganizationId(defaultOrgId);
    setErrors({});
    setFormError(null);
  }, [open, defaultOrgId]);

  async function submit() {
    const parsed = voterListInputSchema.safeParse({ organizationId, name });
    if (!parsed.success) {
      setErrors(
        fieldErrorsFromIssues(parsed.error.issues, {
          organizationId: "Choose an organization.",
          name: "Enter a name between 2 and 120 characters.",
        }),
      );
      return;
    }
    setSaving(true);
    try {
      const list = await createVoterList(parsed.data);
      navigate(`/admin/voter-lists/${list.id}`);
    } catch (error) {
      const fieldErrors = fieldErrorsFromApiError(error);
      if (hasErrors(fieldErrors)) setErrors(fieldErrors);
      else setFormError(describeAdminError(error, "We couldn't create the list"));
      setSaving(false);
    }
  }

  return (
    <FormSheet
      open={open}
      title="New voter list"
      description="Name the list, then add usernames on the next screen."
      submitLabel="Create list"
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
        id="new-list-name"
        label="Name"
        required
        placeholder="e.g. International students"
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          setErrors((er) => ({ ...er, name: undefined }));
        }}
        error={errors.name}
        maxLength={120}
      />
      {orgs.length > 1 ? (
        <Select
          id="new-list-org"
          label="Organization"
          hint="Only this organization's elections can use the list."
          required
          placeholder="Choose an organization"
          options={orgs.map((o) => ({ value: o.id, label: o.name }))}
          value={organizationId}
          onChange={(e) => {
            setOrganizationId(e.target.value);
            setErrors((er) => ({ ...er, organizationId: undefined }));
          }}
          error={errors.organizationId}
        />
      ) : (
        <p className="text-footnote font-normal text-ink-2">For {orgs[0]?.name}.</p>
      )}
    </FormSheet>
  );
}

export function AdminVoterListsPage() {
  usePageTitle("Voter lists · Admin");
  const orgs = useManagedOrganizations();
  const slugs = useMemo(() => ["", ...(orgs.data ?? []).map((o) => o.slug)], [orgs.data]);
  const [org, setOrg] = useSearchParamState<string>("org", slugs, "");
  const lists = useVoterLists(org || undefined);
  const [creating, setCreating] = useState(false);
  const orgList = orgs.data ?? [];
  const noOrgs = orgs.data !== undefined && orgList.length === 0;
  const selectedOrg = orgList.find((o) => o.slug === org);
  const defaultOrgId = selectedOrg?.id ?? (orgList.length === 1 ? orgList[0].id : "");

  const newButton = (
    <Button onClick={() => setCreating(true)} disabled={!orgs.data} leftIcon={<Plus className="size-4" aria-hidden="true" />}>
      New voter list
    </Button>
  );

  let content;
  if (lists.error && !lists.data) {
    content = (
      <div className="rounded-row border border-hairline bg-surface">
        <ErrorState compact title="We couldn't load voter lists" error={lists.error} onRetry={lists.reload} />
      </div>
    );
  } else if (!lists.data) {
    content = (
      <div aria-busy="true">
        <span className="sr-only" role="status">
          Loading voter lists…
        </span>
        <ul className="overflow-hidden rounded-row border border-hairline bg-surface" aria-hidden="true">
          {Array.from({ length: 3 }, (_, i) => (
            <ListRowSkeleton key={i} />
          ))}
        </ul>
      </div>
    );
  } else if (lists.data.length === 0) {
    content = (
      <div className="rounded-row border border-hairline bg-surface">
        <EmptyState
          compact
          icon={<ListChecks aria-hidden="true" />}
          title="No voter lists yet"
          description="Use a voter list when only specific students can vote, like members of a club or international students."
          action={noOrgs ? undefined : newButton}
        />
      </div>
    );
  } else {
    content = (
      <GroupedList label="Voter lists" aria-busy={lists.loading}>
        {[...lists.data]
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((list) => (
            <ListRow
              key={list.id}
              to={`/admin/voter-lists/${list.id}`}
              title={list.name}
              subtitle={list.organization.name}
              trailing={
                <>
                  <span className="tabular">{plural(list.memberCount, "member")}</span>
                  {list.unknownCount > 0 && (
                    <span className="tabular">{list.unknownCount.toLocaleString()} not on roster</span>
                  )}
                </>
              }
            />
          ))}
      </GroupedList>
    );
  }

  return (
    <>
      <PageHeader
        title="Voter lists"
        description="Named lists of students for elections that aren't open to everyone. Elections and positions can limit voting to a list."
        actions={noOrgs ? undefined : newButton}
        className="mb-8 sm:mb-10"
      />
      {orgList.length > 1 && (
        <div className="mb-5">
          <Select
            appearance="quiet"
            aria-label="Organization"
            placeholder="All organizations"
            options={orgList.map((o) => ({ value: o.slug, label: o.name }))}
            value={org}
            onChange={(e) => setOrg(e.target.value)}
          />
        </div>
      )}
      {content}
      {orgs.data && orgList.length > 0 && (
        <NewListSheet open={creating} orgs={orgList} defaultOrgId={defaultOrgId} onClose={() => setCreating(false)} />
      )}
    </>
  );
}
