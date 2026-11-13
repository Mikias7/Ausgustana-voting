import { useId } from "react";
import { useSearchParams } from "react-router-dom";
import { ElectionGrid } from "../components/elections/ElectionGrid";
import { Container } from "../components/ui/Container";
import { PageHeader } from "../components/ui/PageHeader";
import { Select } from "../components/ui/Select";
import { TabPanel, Tabs } from "../components/ui/Tabs";
import { useElections } from "../hooks/useElections";
import { useOrganizations } from "../hooks/useOrganizations";
import { usePageTitle } from "../hooks/usePageTitle";
import { useSearchParamState } from "../hooks/useSearchParamState";
import { ELECTION_TABS, type ElectionTabId } from "../utils/elections";

const TAB_IDS = ELECTION_TABS.map((t) => t.id);

const EMPTY_COPY: Record<ElectionTabId, { title: string; description: string }> = {
  active: {
    title: "No elections are open right now",
    description: "When voting opens for an election, it will appear here. Check the Upcoming tab for what's next.",
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
      label="Organization"
      className="sm:w-64"
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
    <Container className="py-10 sm:py-14">
      <PageHeader
        eyebrow="Student elections"
        title="Elections"
        description="Browse open, upcoming and past elections from ASA and student organizations at Augustana."
        actions={<OrganizationFilter />}
      />
      <Tabs id={tabsId} label="Election status" tabs={ELECTION_TABS} value={tab} onChange={setTab} className="mb-8" />
      <TabPanel tabsId={tabsId} value={tab}>
        <ElectionGrid
          elections={data}
          loading={loading}
          error={error}
          onRetry={reload}
          skeletonCount={6}
          headingLevel="h2"
          emptyTitle={EMPTY_COPY[tab].title}
          emptyDescription={EMPTY_COPY[tab].description}
        />
      </TabPanel>
    </Container>
  );
}
