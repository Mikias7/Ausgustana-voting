import { useMemo, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { CLASS_STANDINGS, type ClassStanding } from "@asa/shared";
import { Search, Wrench } from "lucide-react";
import { getDevUsers, type DevUser } from "../api/auth";
import { getErrorMessage, isApiError } from "../api/client";
import { BRAND } from "../components/layout/brand";
import { Alert } from "../components/ui/Alert";
import { Avatar } from "../components/ui/Avatar";
import { BrandRule } from "../components/ui/BrandRule";
import { Container } from "../components/ui/Container";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { GroupedList } from "../components/ui/GroupedList";
import { Input } from "../components/ui/Input";
import { ListRow } from "../components/ui/ListRow";
import { ListRowSkeleton } from "../components/ui/ListRowSkeleton";
import { Spinner } from "../components/ui/Spinner";
import { useAuth } from "../context/AuthContext";
import { useAsync } from "../hooks/useAsync";
import { usePageTitle } from "../hooks/usePageTitle";
import { safeNextPath } from "../utils/auth";
import { classStandingLabel, classStandingPlural } from "../utils/labels";
import { fullName } from "../utils/text";

/** Accounts shown per group before "Show all" (more while searching). */
const PREVIEW = 5;
const SEARCH_PREVIEW = 25;

interface Group {
  key: string;
  label: string;
  users: DevUser[];
}

/** Admins first, then freshmen → seniors → graduate students, then users without a class. */
function groupUsers(users: DevUser[]): Group[] {
  const byName = (a: DevUser, b: DevUser) =>
    a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName);
  const groups: Group[] = [
    { key: "admin", label: "Administrators", users: users.filter((u) => u.platformRole === "PLATFORM_ADMIN") },
  ];
  const students = users.filter((u) => u.platformRole !== "PLATFORM_ADMIN");
  for (const cls of CLASS_STANDINGS as readonly ClassStanding[]) {
    groups.push({ key: cls, label: classStandingPlural(cls), users: students.filter((u) => u.classStanding === cls) });
  }
  groups.push({ key: "none", label: "Staff & other accounts", users: students.filter((u) => !u.classStanding) });
  return groups.filter((g) => g.users.length > 0).map((g) => ({ ...g, users: [...g.users].sort(byName) }));
}

function matches(user: DevUser, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [user.firstName, user.lastName, user.username, fullName(user)].some((v) => v.toLowerCase().includes(q));
}

function userMeta(u: DevUser): string {
  const role = u.platformRole === "PLATFORM_ADMIN" ? "Administrator" : u.classStanding ? classStandingLabel(u.classStanding) : null;
  return role ? `@${u.username} · ${role}` : `@${u.username}`;
}

export function LoginPage() {
  usePageTitle("Sign in");
  const { user, loading: authLoading, login } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const next = safeNextPath(params.get("next"));
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [pending, setPending] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);

  const users = useAsync((signal) => getDevUsers(signal), []);
  const groups = useMemo(
    () => groupUsers((users.data ?? []).filter((u) => matches(u, query))),
    [users.data, query],
  );

  if (!authLoading && user && !pending) return <Navigate to={next} replace />;

  async function signInAs(username: string) {
    setPending(username);
    setLoginError(null);
    try {
      await login(username);
      navigate(next, { replace: true });
    } catch (err) {
      setLoginError(getErrorMessage(err));
      setPending(null);
    }
  }

  const devDisabled = isApiError(users.error, 404) || isApiError(users.error, 403);

  return (
    <Container size="compact">
      <header className="flex flex-col items-center pt-2 text-center sm:pt-6">
        <img src={BRAND.logo} alt={`${BRAND.orgName} logo`} className="size-14" width={56} height={56} />
        <BrandRule size="md" className="mt-6" />
        <h1 className="mt-4 text-large-title">Sign in</h1>
        <p className="mt-2 text-callout text-ink-2">
          to {BRAND.appName} · {BRAND.university}
        </p>
      </header>

      <Alert tone="warning" className="mt-8" icon={<Wrench aria-hidden="true" />} title="Development sign-in">
        University login will be added later. For now, choose a test account to sign in as.
      </Alert>

      {loginError && (
        <Alert tone="error" className="mt-4" title="Sign-in failed">
          {loginError}
        </Alert>
      )}

      <div className="mt-8">
        {users.loading && !users.data ? (
          <>
            <span className="sr-only" role="status">
              Loading test accounts…
            </span>
            <GroupedList label="Loading test accounts" aria-busy>
              {[0, 1, 2, 3].map((i) => (
                <ListRowSkeleton key={i} leading />
              ))}
            </GroupedList>
          </>
        ) : users.error ? (
          devDisabled ? (
            <EmptyState
              compact
              title="Development sign-in is not enabled"
              description="This server isn't running in development auth mode. University sign-in is coming soon."
            />
          ) : (
            <ErrorState compact title="We couldn't load test accounts" error={users.error} onRetry={users.reload} />
          )
        ) : (
          <>
            <Input
              id="dev-user-search"
              type="search"
              label="Find an account"
              placeholder="Search by name or username"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoComplete="off"
              leadingIcon={<Search aria-hidden="true" />}
            />

            {groups.length === 0 ? (
              <p className="mt-8 text-center text-callout text-ink-2" role="status">
                {(users.data ?? []).length === 0
                  ? "No test accounts exist yet. Seed the database first."
                  : `No accounts match “${query}”.`}
              </p>
            ) : (
              <div className="mt-8 space-y-7">
                {groups.map((group) => {
                  // A real roster has thousands of students: show a few per class unless expanded.
                  const limit = expanded.has(group.key) ? Infinity : query.trim() ? SEARCH_PREVIEW : PREVIEW;
                  const shown = group.users.slice(0, limit);
                  const hidden = group.users.length - shown.length;
                  return (
                  <div key={group.key}>
                  <GroupedList
                    title={
                      <>
                        {group.label} <span className="font-normal tabular">({group.users.length})</span>
                      </>
                    }
                  >
                    {shown.map((u) => (
                      <ListRow
                        key={u.id}
                        title={fullName(u)}
                        subtitle={userMeta(u)}
                        leading={<Avatar name={fullName(u)} size="md" />}
                        onClick={() => signInAs(u.username)}
                        disabled={pending !== null}
                        busy={pending === u.username}
                        srSuffix="— sign in as this account"
                        accessory={pending === u.username ? <Spinner className="size-4 text-navy-900" /> : undefined}
                      />
                    ))}
                  </GroupedList>
                  {hidden > 0 && (
                    <button
                      type="button"
                      onClick={() => setExpanded((prev) => new Set(prev).add(group.key))}
                      className="mt-1.5 ml-4 inline-flex min-h-11 items-center rounded-full px-1 text-callout font-medium text-navy-900 hover:text-navy-600"
                    >
                      Show all {group.users.length.toLocaleString()} {group.label.toLowerCase()}
                    </button>
                  )}
                  </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </Container>
  );
}
