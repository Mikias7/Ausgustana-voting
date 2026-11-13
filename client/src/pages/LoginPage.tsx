import { useMemo, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { CLASS_STANDINGS, type ClassStanding } from "@asa/shared";
import { ChevronRight, Search, Wrench } from "lucide-react";
import { getDevUsers, type DevUser } from "../api/auth";
import { getErrorMessage, isApiError } from "../api/client";
import { BRAND } from "../components/layout/brand";
import { Alert } from "../components/ui/Alert";
import { Avatar } from "../components/ui/Avatar";
import { Badge } from "../components/ui/Badge";
import { Card } from "../components/ui/Card";
import { Container } from "../components/ui/Container";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { Input } from "../components/ui/Input";
import { LoadingState } from "../components/ui/LoadingState";
import { Spinner } from "../components/ui/Spinner";
import { useAuth } from "../context/AuthContext";
import { useAsync } from "../hooks/useAsync";
import { usePageTitle } from "../hooks/usePageTitle";
import { safeNextPath } from "../utils/auth";
import { classStandingLabel, classStandingPlural } from "../utils/labels";
import { fullName } from "../utils/text";

interface Group {
  key: string;
  label: string;
  users: DevUser[];
}

/** Admins first, then seniors → freshmen, then users without a class. */
function groupUsers(users: DevUser[]): Group[] {
  const byName = (a: DevUser, b: DevUser) =>
    a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName);
  const groups: Group[] = [
    { key: "admin", label: "Administrators", users: users.filter((u) => u.platformRole === "PLATFORM_ADMIN") },
  ];
  const students = users.filter((u) => u.platformRole !== "PLATFORM_ADMIN");
  for (const cls of [...CLASS_STANDINGS].reverse() as ClassStanding[]) {
    groups.push({ key: cls, label: classStandingPlural(cls), users: students.filter((u) => u.classStanding === cls) });
  }
  groups.push({ key: "none", label: "No class standing", users: students.filter((u) => !u.classStanding) });
  return groups.filter((g) => g.users.length > 0).map((g) => ({ ...g, users: [...g.users].sort(byName) }));
}

function matches(user: DevUser, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [user.firstName, user.lastName, user.username, fullName(user)].some((v) => v.toLowerCase().includes(q));
}

export function LoginPage() {
  usePageTitle("Sign in");
  const { user, loading: authLoading, login } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const next = safeNextPath(params.get("next"));
  const [query, setQuery] = useState("");
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
    <div className="flex-1 bg-linear-to-b from-augie-blue-50 to-slate-50">
      <Container size="sm" className="py-12 sm:py-16">
        <Card padding="lg" className="mx-auto max-w-xl">
          <div className="flex flex-col items-center text-center">
            <img src={BRAND.logo} alt={`${BRAND.orgName} logo`} className="size-20" width={80} height={80} />
            <h1 className="mt-4 text-3xl font-semibold">Sign in</h1>
            <p className="mt-1 text-sm text-slate-600">to {BRAND.appName} · {BRAND.university}</p>
          </div>

          <Alert tone="warning" className="mt-6" icon={<Wrench className="size-5" aria-hidden="true" />} title="Development sign-in">
            University login will be added later. For now, choose a test account to sign in as.
          </Alert>

          {loginError && (
            <Alert tone="error" className="mt-4" title="Sign-in failed">
              {loginError}
            </Alert>
          )}

          <div className="mt-6">
            {users.loading && !users.data ? (
              <LoadingState label="Loading test accounts…" className="py-10" />
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
                <label htmlFor="dev-user-search" className="text-sm font-semibold text-slate-800">
                  Find an account
                </label>
                <div className="relative mt-1.5">
                  <Search
                    className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400"
                    aria-hidden="true"
                  />
                  <Input
                    id="dev-user-search"
                    type="search"
                    placeholder="Search by name or username"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    autoComplete="off"
                    className="pl-9"
                  />
                </div>

                {groups.length === 0 ? (
                  <p className="mt-6 text-center text-sm text-slate-600" role="status">
                    {(users.data ?? []).length === 0 ? "No test accounts exist yet. Seed the database first." : `No accounts match “${query}”.`}
                  </p>
                ) : (
                  <div className="mt-5 max-h-[28rem] space-y-5 overflow-y-auto pr-1">
                    {groups.map((group) => (
                      <section key={group.key} aria-labelledby={`group-${group.key}`}>
                        <h2
                          id={`group-${group.key}`}
                          className="mb-2 font-sans text-xs font-semibold tracking-[0.14em] text-slate-500 uppercase"
                        >
                          {group.label} <span className="font-normal">({group.users.length})</span>
                        </h2>
                        <ul className="space-y-1.5">
                          {group.users.map((u) => (
                            <li key={u.id}>
                              <button
                                type="button"
                                onClick={() => signInAs(u.username)}
                                disabled={pending !== null}
                                aria-busy={pending === u.username || undefined}
                                className="group flex w-full items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-left transition-colors hover:border-augie-blue-300 hover:bg-augie-blue-50 disabled:cursor-wait disabled:opacity-60"
                              >
                                <Avatar name={fullName(u)} size="sm" />
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-sm font-semibold text-slate-900">{fullName(u)}</span>
                                  <span className="block truncate text-xs text-slate-500">@{u.username}</span>
                                </span>
                                {u.platformRole === "PLATFORM_ADMIN" ? (
                                  <Badge tone="navy">Admin</Badge>
                                ) : (
                                  u.classStanding && <Badge tone="slate">{classStandingLabel(u.classStanding)}</Badge>
                                )}
                                {pending === u.username ? (
                                  <Spinner className="size-4 text-augie-blue" />
                                ) : (
                                  <ChevronRight className="size-4 text-slate-400 group-hover:text-augie-blue" aria-hidden="true" />
                                )}
                                <span className="sr-only">Sign in as {fullName(u)}</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      </section>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </Card>
      </Container>
    </div>
  );
}
