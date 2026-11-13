import { useEffect, useId, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Trash2, Users } from "lucide-react";
import type { VoterListDetail } from "@asa/shared";
import { deleteVoterList, renameVoterList, setVoterListMembers } from "../../api/admin/voterLists";
import { isApiError } from "../../api/client";
import { BackLink, PanelTitle } from "../../components/admin-elections/AdminBits";
import { Alert } from "../../components/ui/Alert";
import { Button } from "../../components/ui/Button";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import { GroupedList } from "../../components/ui/GroupedList";
import { Input } from "../../components/ui/Input";
import { ListRow } from "../../components/ui/ListRow";
import { PageHeader } from "../../components/ui/PageHeader";
import { Panel } from "../../components/ui/Panel";
import { SegmentedControl } from "../../components/ui/SegmentedControl";
import { Skeleton } from "../../components/ui/Skeleton";
import { StatusIndicator } from "../../components/ui/StatusIndicator";
import { TabPanel } from "../../components/ui/TabPanel";
import { Textarea } from "../../components/ui/Textarea";
import { usePageTitle } from "../../hooks/usePageTitle";
import { useVoterList } from "../../hooks/useVoterLists";
import { describeAdminError, parseUsernames, plural } from "../../utils/adminElections";

interface Notice {
  tone: "error" | "success";
  title: string;
  message?: string;
  elections?: Array<{ id: string; title: string }>;
}

const MAX_MEMBERS = 10000;
const PAGE = 200;

/** Elections named in a 409's `details.elections`, if any. */
function electionsFrom(error: unknown): Array<{ id: string; title: string }> {
  if (!isApiError(error) || typeof error.details !== "object" || error.details === null) return [];
  const list = (error.details as { elections?: unknown }).elections;
  return Array.isArray(list) ? (list as Array<{ id: string; title: string }>) : [];
}

function errorNotice(error: unknown, fallback: string): Notice {
  if (isApiError(error) && error.code === "ELECTION_LOCKED") {
    return {
      tone: "error",
      title: "This list is used by an election that's open",
      message: "Its members can't change while voting is open, so every voter sees the same rules.",
      elections: electionsFrom(error),
    };
  }
  return { tone: "error", ...describeAdminError(error, fallback), elections: electionsFrom(error) };
}

function RenamePanel({ list, onSaved, onNotice }: { list: VoterListDetail; onSaved: (l: VoterListDetail) => void; onNotice: (n: Notice) => void }) {
  const [name, setName] = useState(list.name);
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);
  useEffect(() => setName(list.name), [list.name]);
  const dirty = name.trim() !== list.name;

  async function submit(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2 || trimmed.length > 120) {
      setError("Enter a name between 2 and 120 characters.");
      return;
    }
    setSaving(true);
    try {
      onSaved(await renameVoterList(list.id, trimmed));
      onNotice({ tone: "success", title: "List renamed" });
    } catch (err) {
      onNotice(errorNotice(err, "We couldn't rename the list"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Panel as="section" aria-labelledby="rename-heading">
      <PanelTitle id="rename-heading" title="Name" />
      <form noValidate onSubmit={submit} className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <Input
          id="list-name"
          aria-label="List name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError(undefined);
          }}
          error={error}
          maxLength={120}
          fieldClassName="flex-1"
        />
        <Button type="submit" variant="secondary" disabled={!dirty} loading={saving}>
          Rename
        </Button>
      </form>
    </Panel>
  );
}

function MembersEditor({ list, onSaved, onNotice }: { list: VoterListDetail; onSaved: (l: VoterListDetail) => void; onNotice: (n: Notice) => void }) {
  const original = useMemo(() => list.members.map((m) => m.username).join("\n"), [list.members]);
  const [text, setText] = useState(original);
  const [saving, setSaving] = useState(false);
  useEffect(() => setText(original), [original]);
  const usernames = useMemo(() => parseUsernames(text), [text]);
  const originalSet = useMemo(() => new Set(list.members.map((m) => m.username)), [list.members]);
  const added = usernames.filter((u) => !originalSet.has(u)).length;
  const removed = list.members.length - usernames.filter((u) => originalSet.has(u)).length;
  const dirty = added > 0 || removed > 0;
  const tooMany = usernames.length > MAX_MEMBERS;

  async function save() {
    setSaving(true);
    try {
      onSaved(await setVoterListMembers(list.id, usernames));
      onNotice({ tone: "success", title: "Members saved", message: `${plural(usernames.length, "member")} on this list.` });
    } catch (err) {
      onNotice(errorNotice(err, "We couldn't save the members"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Panel as="section" aria-labelledby="members-edit-heading">
      <PanelTitle
        id="members-edit-heading"
        title="Members"
        description="Saving replaces the whole list with the usernames below."
      />
      <Textarea
        id="list-members"
        label="Usernames"
        hint="One username per line, or separated by commas. Email addresses are turned into usernames. Students not on the roster yet are kept and count once they're imported."
        rows={10}
        spellCheck={false}
        autoCapitalize="off"
        autoComplete="off"
        className="font-mono text-callout"
        value={text}
        onChange={(e) => setText(e.target.value)}
        error={tooMany ? `A list can have up to ${MAX_MEMBERS.toLocaleString()} usernames.` : undefined}
      />
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-footnote font-normal text-ink-2" aria-live="polite">
          <span className="tabular font-medium text-ink">{plural(usernames.length, "username")}</span>
          {dirty && (
            <span className="tabular">
              {" "}
              · {added} added · {removed} removed
            </span>
          )}
        </p>
        <div className="flex flex-col-reverse gap-3 sm:flex-row">
          {dirty && (
            <Button variant="secondary" onClick={() => setText(original)} disabled={saving}>
              Discard
            </Button>
          )}
          <Button onClick={save} disabled={!dirty || tooMany} loading={saving}>
            Save members
          </Button>
        </div>
      </div>
    </Panel>
  );
}

type MemberFilter = "all" | "unknown";

function MembersList({ list }: { list: VoterListDetail }) {
  const tabsId = useId();
  const [filter, setFilter] = useState<MemberFilter>("all");
  const [limit, setLimit] = useState(PAGE);
  const unknown = list.members.filter((m) => !m.onRoster);
  const shown = filter === "all" ? list.members : unknown;

  if (list.members.length === 0) {
    return (
      <Panel padding="none">
        <EmptyState
          compact
          icon={<Users aria-hidden="true" />}
          title="No members yet"
          description="Paste usernames above and save to add students."
        />
      </Panel>
    );
  }

  return (
    <section aria-labelledby="members-heading">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 id="members-heading" className="text-title-3">
          On this list
        </h2>
        <SegmentedControl
          id={tabsId}
          label="Filter members"
          items={[
            { id: "all", label: "All", count: list.members.length },
            { id: "unknown", label: "Not on roster", count: unknown.length },
          ]}
          value={filter}
          onChange={(v) => {
            setFilter(v);
            setLimit(PAGE);
          }}
          className="w-full sm:w-auto"
        />
      </div>
      <TabPanel tabsId={tabsId} value={filter}>
        {shown.length === 0 ? (
          <p className="rounded-row bg-inset px-4 py-3 text-callout text-ink-2">Everyone on this list is on the roster.</p>
        ) : (
          <>
            <GroupedList label="Members">
              {shown.slice(0, limit).map((m) => (
                <ListRow
                  key={m.username}
                  title={m.name ?? m.username}
                  subtitle={m.name ? m.username : undefined}
                  inlineTrailing
                  trailing={
                    m.onRoster ? (
                      <StatusIndicator tone="success" label="On roster" />
                    ) : (
                      <StatusIndicator tone="warning" label="Not on roster" />
                    )
                  }
                />
              ))}
            </GroupedList>
            {shown.length > limit && (
              <div className="mt-4 flex justify-center">
                <Button variant="secondary" size="sm" onClick={() => setLimit((l) => l + PAGE)}>
                  Show more ({(shown.length - limit).toLocaleString()} left)
                </Button>
              </div>
            )}
          </>
        )}
      </TabPanel>
    </section>
  );
}

export function AdminVoterListDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, error, reload } = useVoterList(id);
  const [list, setList] = useState<VoterListDetail>();
  const [notice, setNotice] = useState<Notice | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  useEffect(() => setList(data), [data]);
  usePageTitle(list ? `${list.name} · Voter lists` : "Voter list · Admin");

  async function remove() {
    if (!list) return;
    setDeleting(true);
    try {
      await deleteVoterList(list.id);
      navigate("/admin/voter-lists", { replace: true });
    } catch (err) {
      setNotice(errorNotice(err, "We couldn't delete the list"));
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  const back = <BackLink to="/admin/voter-lists" label="Voter lists" />;

  if (error && !list) {
    const notFound = isApiError(error, 404);
    return (
      <>
        {back}
        <ErrorState
          title={notFound ? "Voter list not found" : "We couldn't load this list"}
          message={notFound ? "It may have been deleted." : undefined}
          error={error}
          onRetry={notFound ? undefined : reload}
        />
      </>
    );
  }
  if (!list) {
    return (
      <div aria-busy="true">
        <span className="sr-only" role="status">
          Loading voter list…
        </span>
        <div className="space-y-4" aria-hidden="true">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-9 w-1/2" />
          <Skeleton className="mt-10 h-48 w-full rounded-panel" />
        </div>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        breadcrumb={back}
        eyebrow={list.organization.name}
        title={list.name}
        description={
          <span className="tabular">
            {plural(list.memberCount, "member")}
            {list.unknownCount > 0 && ` · ${list.unknownCount.toLocaleString()} not on the roster`}
          </span>
        }
        actions={
          <Button variant="secondary" onClick={() => setConfirmDelete(true)} leftIcon={<Trash2 className="size-4" aria-hidden="true" />}>
            Delete list
          </Button>
        }
        className="mb-8 sm:mb-10"
      />
      {notice && (
        <Alert tone={notice.tone} title={notice.title} className="mb-6">
          {notice.message}
          {notice.elections && notice.elections.length > 0 && (
            <ul className="mt-1.5 list-disc pl-5">
              {notice.elections.map((e) => (
                <li key={e.id}>
                  <Link to={`/admin/elections/${e.id}`} className="font-medium text-navy-900 underline-offset-2 hover:underline">
                    {e.title}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Alert>
      )}
      <div className="space-y-6">
        <RenamePanel list={list} onSaved={setList} onNotice={setNotice} />
        <MembersEditor list={list} onSaved={setList} onNotice={setNotice} />
        <div className="pt-6">
          <MembersList list={list} />
        </div>
      </div>
      <ConfirmDialog
        open={confirmDelete}
        tone="danger"
        loading={deleting}
        title="Delete this voter list?"
        description={`“${list.name}” and its ${plural(list.memberCount, "member")} will be deleted. Elections that use it must switch to another rule first.`}
        confirmLabel="Delete list"
        onCancel={() => setConfirmDelete(false)}
        onConfirm={remove}
      />
    </>
  );
}
