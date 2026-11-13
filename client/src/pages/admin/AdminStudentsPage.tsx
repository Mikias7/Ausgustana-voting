import { useEffect, useId, useState } from "react";
import { Search, Upload } from "lucide-react";
import { ImportDetailModal } from "../../components/roster/ImportDetailModal";
import { ImportHistoryList } from "../../components/roster/ImportHistoryList";
import { RosterStatsStrip } from "../../components/roster/RosterStatsStrip";
import { StudentsTable } from "../../components/roster/StudentsTable";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { PageHeader } from "../../components/ui/PageHeader";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { SegmentedControl } from "../../components/ui/SegmentedControl";
import { Select } from "../../components/ui/Select";
import { TabPanel } from "../../components/ui/TabPanel";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { usePageTitle } from "../../hooks/usePageTitle";
import { useImportHistory, useRosterStats, useStudents } from "../../hooks/useRoster";
import { useStudentFilters, type ClassFilterValue } from "../../hooks/useStudentFilters";
import type { StudentRosterFilter } from "../../api/admin/roster";
import { PlatformAdminOnly } from "./PlatformAdminOnly";

const CLASS_OPTIONS: Array<{ value: Exclude<ClassFilterValue, "all">; label: string }> = [
  { value: "FR", label: "Freshmen" },
  { value: "SO", label: "Sophomores" },
  { value: "JR", label: "Juniors" },
  { value: "SR", label: "Seniors" },
  { value: "NONE", label: "No class" },
];

const ROSTER_ITEMS: Array<{ id: StudentRosterFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "on", label: "On roster" },
  { id: "off", label: "Off roster" },
];

function StudentsSection() {
  const tabsId = useId();
  const filters = useStudentFilters();
  const { data, loading, error, reload } = useStudents(filters.apiFilters);

  // The input updates instantly; the URL (and the request) follow 300ms after typing stops.
  const [query, setQuery] = useState(filters.search);
  const debounced = useDebouncedValue(query, 300);
  const { search, setSearch } = filters;
  useEffect(() => {
    if (debounced.trim() !== search) setSearch(debounced);
    // Only react to typing, not to URL changes (handled below).
  }, [debounced]);
  // Keep the input in sync when the URL changes elsewhere (Clear filters, back/forward).
  useEffect(() => {
    setQuery((q) => (q.trim() === search ? q : search));
  }, [search]);

  return (
    <section aria-labelledby="students-heading">
      <SectionHeader id="students-heading" title="All students" />
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center">
        <Input
          type="search"
          aria-label="Search students"
          placeholder="Search students"
          leadingIcon={<Search aria-hidden="true" />}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          fieldClassName="flex-1"
          className="lg:max-w-sm"
        />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:ml-auto">
          <Select
            appearance="quiet"
            aria-label="Class"
            placeholder="All classes"
            options={CLASS_OPTIONS}
            value={filters.classFilter === "all" ? "" : filters.classFilter}
            onChange={(e) => filters.setClassFilter((e.target.value || "all") as ClassFilterValue)}
          />
          <SegmentedControl
            id={tabsId}
            label="Roster status"
            items={ROSTER_ITEMS}
            value={filters.roster}
            onChange={filters.setRoster}
            className="w-full sm:w-auto"
          />
        </div>
      </div>
      <TabPanel tabsId={tabsId} value={filters.roster}>
        <StudentsTable
          data={data}
          loading={loading}
          error={error}
          onRetry={reload}
          filtered={filters.filtered}
          onClearFilters={() => {
            setQuery("");
            filters.clear();
          }}
          onPageChange={filters.setPage}
        />
      </TabPanel>
    </section>
  );
}

function HistorySection() {
  const { data, loading, error, reload } = useImportHistory();
  const [openId, setOpenId] = useState<string | null>(null);
  return (
    <section aria-labelledby="history-heading">
      <SectionHeader
        id="history-heading"
        title="Import history"
        description="Every roster upload, with what changed."
      />
      <ImportHistoryList items={data} loading={loading} error={error} onRetry={reload} onOpen={setOpenId} />
      <ImportDetailModal id={openId} onClose={() => setOpenId(null)} />
    </section>
  );
}

function StudentsContent() {
  const stats = useRosterStats();
  return (
    <>
      <PageHeader
        title="Students"
        description="The university roster decides who can vote. Students are never deleted; anyone left out of a full sync is marked off-roster."
        actions={
          <Button to="/admin/students/import" leftIcon={<Upload className="size-4" aria-hidden="true" />}>
            Import roster
          </Button>
        }
        className="mb-8 sm:mb-10"
      />
      <RosterStatsStrip stats={stats.data} loading={stats.loading} />
      <div className="space-y-16">
        <StudentsSection />
        <HistorySection />
      </div>
    </>
  );
}

export function AdminStudentsPage() {
  usePageTitle("Students · Admin");
  return (
    <PlatformAdminOnly>
      <StudentsContent />
    </PlatformAdminOnly>
  );
}
