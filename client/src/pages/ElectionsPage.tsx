import { useId } from "react";
import { useSearchParams } from "react-router-dom";
import { ElectionList } from "../components/elections/ElectionList";
import { Container } from "../components/ui/Container";
import { PageHeader } from "../components/ui/PageHeader";
import { SegmentedControl } from "../components/ui/SegmentedControl";
import { Select } from "../components/ui/Select";
import { TabPanel } from "../components/ui/TabPanel";
import { useElections } from "../hooks/useElections";
import { useOrganizations } from "../hooks/useOrganizations";
import { usePageTitle } from "../hooks/usePageTitle";
import { useSearchParamState } from "../hooks/useSearchParamState";
import { ELECTION_TABS, type ElectionTabId } from "../utils/elections";

const TAB_IDS = ELECTION_TABS.map((t) => t.id);

const EMPTY_COPY: Record<ElectionTabId, { title: string; description: string }> = {
  active: {
    title: "No elections are open right now",
    description: "When voting opens for an election, it will appear here. Check Upcoming for what's next.",
  },
  upcoming: {
    title: "No upcoming elections",
    description: "ASA and student organizations announce elections throughout the year.",
  },
  past: {
    title: "No past elections yet",
    description: "Closed elections and their published results will be listed here.",
  },
};

function OrganizationFilter() {
  const [params, setParams] = useSearchParams();
  const { data } = useOrganizations();
  if (!data || data.length < 2) return null;
  return (
    <Select
      appearance="quiet"
      aria-label="Organization"
      className="w-full sm:w-auto sm:max-w-64"
      value={params.get("org") ?? ""}
      placeholder="All organizations"
      options={data.map((o) => ({ value: o.slug, label: o.name }))}
      onChange={(e) =>
        setParams(
          (prev) => {
            const next = new URLSearchParams(prev);
            if (e.target.value) next.set("org", e.target.value);
            else next.delete("org");
            return next;
          },
          { replace: true, preventScrollReset: true },
        )
      }
    />
  );
}

export function ElectionsPage() {
  usePageTitle("Elections");
  const tabsId = useId();
  const [params] = useSearchParams();
  const [tab, setTab] = useSearchParamState<ElectionTabId>("tab", TAB_IDS, "active");
  const org = params.get("org") ?? undefined;
  const phase = ELECTION_TABS.find((t) => t.id === tab)!.phase;
  const { data, loading, error, reload } = useElections(phase, org);

  return (
    <Container>
      <PageHeader
        title="Elections"
        description="Open, upcoming and past elections from ASA and student organizations at Augustana."
      />
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SegmentedControl
          id={tabsId}
          label="Election status"
          items={ELECTION_TABS}
          value={tab}
          onChange={setTab}
          className="w-full sm:w-auto"
        />
        <OrganizationFilter />
      </div>
      <TabPanel tabsId={tabsId} value={tab}>
        <ElectionList
          label={`${ELECTION_TABS.find((t) => t.id === tab)!.label} elections`}
          elections={data}
          loading={loading}
          error={error}
          onRetry={reload}
          skeletonCount={5}
          headingLevel="h2"
          emptyTitle={EMPTY_COPY[tab].title}
          emptyDescription={EMPTY_COPY[tab].description}
        />
      </TabPanel>
    </Container>
  );
}
