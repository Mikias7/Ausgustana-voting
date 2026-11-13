import { useId, useMemo } from "react";
import { Plus, Vote } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { GroupedList } from "../../components/ui/GroupedList";
import { ListRow } from "../../components/ui/ListRow";
import { ListRowSkeleton } from "../../components/ui/ListRowSkeleton";
import { PageHeader } from "../../components/ui/PageHeader";
import { SegmentedControl } from "../../components/ui/SegmentedControl";
import { Select } from "../../components/ui/Select";
import { StatusIndicator } from "../../components/ui/StatusIndicator";
import { TabPanel } from "../../components/ui/TabPanel";
import { useAdminElections, useManagedOrganizations } from "../../hooks/useAdminElections";
import { usePageTitle } from "../../hooks/usePageTitle";
import { useSearchParamState } from "../../hooks/useSearchParamState";
import {
  ADMIN_PHASE_FILTER_IDS,
  ADMIN_PHASE_FILTERS,
  matchesPhaseFilter,
  plural,
  sortAdminElections,
  structureSummary,
  type AdminPhaseFilter,
} from "../../utils/adminElections";
import { formatDateRange } from "../../utils/dates";

const EMPTY_COPY: Record<AdminPhaseFilter, string> = {
  all: "No elections yet",
  draft: "No drafts",
  upcoming: "Nothing scheduled",
  open: "No elections are open",
  closed: "No closed elections",
};

export function AdminElectionsPage() {
  usePageTitle("Elections · Admin");
  const tabsId = useId();
  const orgs = useManagedOrganizations();
  const orgSlugs = useMemo(() => ["", ...(orgs.data ?? []).map((o) => o.slug)], [orgs.data]);
  const [org, setOrg] = useSearchParamState<string>("org", orgSlugs, "");
  const [phase, setPhase] = useSearchParamState<AdminPhaseFilter>("phase", ADMIN_PHASE_FILTER_IDS, "all");
  const { data, loading, error, reload } = useAdminElections({ org: org || undefined });

  const sorted = useMemo(() => (data ? sortAdminElections(data) : undefined), [data]);
  const visible = sorted?.filter((e) => matchesPhaseFilter(e.phase, phase));
  const items = ADMIN_PHASE_FILTERS.map((f) => ({
    ...f,
    count: sorted ? sorted.filter((e) => matchesPhaseFilter(e.phase, f.id)).length : undefined,
  }));
  const multipleOrgs = (orgs.data?.length ?? 0) > 1;
  const noOrgs = orgs.data !== undefined && orgs.data.length === 0;

  const newButton = (
    <Button to="/admin/elections/new" leftIcon={<Plus className="size-4" aria-hidden="true" />}>
      New election
    </Button>
  );

  let content;
  if (error && !data) {
    content = (
      <div className="rounded-row border border-hairline bg-surface">
        <ErrorState compact title="We couldn't load elections" error={error} onRetry={reload} />
      </div>
    );
  } else if (!visible) {
    content = (
      <div aria-busy="true">
        <span className="sr-only" role="status">
          Loading elections…
        </span>
        <ul className="overflow-hidden rounded-row border border-hairline bg-surface" aria-hidden="true">
          {Array.from({ length: 4 }, (_, i) => (
            <ListRowSkeleton key={i} />
          ))}
        </ul>
      </div>
    );
  } else if (visible.length === 0) {
    const nothingAtAll = phase === "all";
    content = (
      <div className="rounded-row border border-hairline bg-surface">
        <EmptyState
          compact
          icon={<Vote aria-hidden="true" />}
          title={EMPTY_COPY[phase]}
          description={
            nothingAtAll
              ? "Create a draft, add positions and candidates, then publish it when it's ready."
              : "Try another filter."
          }
          action={
            nothingAtAll ? (
              noOrgs ? undefined : newButton
            ) : (
              <Button variant="secondary" size="sm" onClick={() => setPhase("all")}>
                Show all elections
              </Button>
            )
          }
        />
      </div>
    );
  } else {
    content = (
      <GroupedList label="Elections" aria-busy={loading}>
        {visible.map((e) => (
          <ListRow
            key={e.id}
            to={`/admin/elections/${e.id}`}
            titleAs="h2"
            accent
            title={e.title}
            subtitle={
              <>
                {e.organization.name} · {formatDateRange(e.startsAt, e.endsAt)}
              </>
            }
            trailing={
              <>
                <span className="tabular">{structureSummary(e)}</span>
                {(e.phase === "open" || e.phase === "closed") && (
                  <span className="tabular">{plural(e.votedCount, "vote")} cast</span>
                )}
                <StatusIndicator phase={e.phase} />
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
        title="Elections"
        description="Create elections, add positions and candidates, and publish them when they're ready."
        actions={noOrgs ? undefined : newButton}
        className="mb-8 sm:mb-10"
      />
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        {multipleOrgs && (
          <Select
            appearance="quiet"
            aria-label="Organization"
            placeholder="All organizations"
            options={(orgs.data ?? []).map((o) => ({ value: o.slug, label: o.name }))}
            value={org}
            onChange={(e) => setOrg(e.target.value)}
          />
        )}
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:ml-auto sm:overflow-visible sm:px-0">
          <SegmentedControl id={tabsId} label="Filter by status" items={items} value={phase} onChange={setPhase} />
        </div>
      </div>
      <TabPanel tabsId={tabsId} value={phase}>
        {content}
      </TabPanel>
    </>
  );
}
