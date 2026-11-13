import { Lock, Vote } from "lucide-react";
import { Link } from "react-router-dom";
import { Avatar } from "../components/ui/Avatar";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Container } from "../components/ui/Container";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { PageHeader } from "../components/ui/PageHeader";
import { Skeleton } from "../components/ui/Skeleton";
import { useProfile } from "../hooks/useProfile";
import { usePageTitle } from "../hooks/usePageTitle";
import { formatDateTime, toIso } from "../utils/dates";
import { classStandingLabel, orgRoleLabel, platformRoleLabel } from "../utils/labels";
import { fullName } from "../utils/text";

function ProfileSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
      <span className="sr-only" role="status">
        Loading your profile…
      </span>
      <Skeleton className="h-80 rounded-xl" />
      <Skeleton className="h-80 rounded-xl" />
    </div>
  );
}

export function ProfilePage() {
  usePageTitle("My profile");
  const { data: profile, loading, error, reload } = useProfile();

  return (
    <Container className="py-10 sm:py-14">
      <PageHeader eyebrow="Your account" title="My profile" description="Your details from the university roster and your voting history." />

      {loading && !profile ? (
        <ProfileSkeleton />
      ) : error || !profile ? (
        <ErrorState title="We couldn't load your profile" error={error} onRetry={reload} />
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[20rem_1fr]">
          <Card as="section" aria-labelledby="details-heading">
            <div className="flex flex-col items-center text-center">
              <Avatar name={fullName(profile)} size="xl" />
              <h2 id="details-heading" className="mt-4 text-xl font-semibold">
                {fullName(profile)}
              </h2>
              <p className="text-sm text-slate-500">@{profile.username}</p>
              <div className="mt-3">
                {profile.onRoster ? (
                  <Badge tone="green" dot>
                    On current roster
                  </Badge>
                ) : (
                  <Badge tone="slate" dot>
                    Not on current roster
                  </Badge>
                )}
              </div>
            </div>
            <dl className="mt-6 space-y-4 border-t border-slate-100 pt-5 text-sm">
              <div>
                <dt className="font-medium text-slate-500">Email</dt>
                <dd className="break-all text-slate-900">{profile.email}</dd>
              </div>
              <div>
                <dt className="font-medium text-slate-500">Class standing</dt>
                <dd className="text-slate-900">{classStandingLabel(profile.classStanding)}</dd>
              </div>
              <div>
                <dt className="font-medium text-slate-500">Role</dt>
                <dd className="text-slate-900">{platformRoleLabel(profile.platformRole)}</dd>
              </div>
              {profile.orgRoles.length > 0 && (
                <div>
                  <dt className="font-medium text-slate-500">Organization roles</dt>
                  <dd>
                    <ul className="mt-1 space-y-1">
                      {profile.orgRoles.map((r) => (
                        <li key={`${r.organizationId}-${r.role}`} className="text-slate-900">
                          {orgRoleLabel(r.role)} · <span className="text-slate-600">{r.organizationSlug}</span>
                        </li>
                      ))}
                    </ul>
                  </dd>
                </div>
              )}
            </dl>
            {!profile.onRoster && (
              <p className="mt-5 rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
                Only students on the current university roster can vote. If you think this is wrong, please{" "}
                <Link to="/contact" className="font-medium text-augie-blue-700 underline">contact ASA</Link>.
              </p>
            )}
          </Card>

          <Card as="section" padding="none" aria-labelledby="history-heading">
            <div className="p-5 sm:p-6">
              <h2 id="history-heading" className="text-xl font-semibold">
                Voting history
              </h2>
              <div className="mt-3 flex gap-3 rounded-lg border border-augie-gold-300 bg-augie-gold-50 p-3 text-sm text-augie-gold-900">
                <Lock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <p>
                  Your ballot choices are private. This list only shows <em>that</em> you voted — never{" "}
                  <em>how</em>. Ballots are stored without any link to your name.
                </p>
              </div>
            </div>

            {profile.participations.length === 0 ? (
              <div className="px-5 pb-6 sm:px-6">
                <EmptyState
                  compact
                  icon={<Vote className="size-6" aria-hidden="true" />}
                  title="You haven't voted yet"
                  description="Elections you take part in will be listed here."
                  action={
                    <Button to="/elections" variant="secondary" size="sm">
                      See open elections
                    </Button>
                  }
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <caption className="sr-only">Elections you have voted in</caption>
                  <thead className="border-y border-slate-200 bg-slate-50 text-xs tracking-wider text-slate-500 uppercase">
                    <tr>
                      <th scope="col" className="px-5 py-3 font-semibold sm:px-6">Election</th>
                      <th scope="col" className="px-5 py-3 font-semibold">Organization</th>
                      <th scope="col" className="px-5 py-3 font-semibold sm:px-6">Voted</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {profile.participations.map((p) => (
                      <tr key={p.electionId} className="hover:bg-slate-50/70">
                        <td className="px-5 py-3.5 sm:px-6">
                          <Link to={`/elections/${p.electionId}`} className="font-medium text-augie-blue-700 hover:underline">
                            {p.electionTitle}
                          </Link>
                        </td>
                        <td className="px-5 py-3.5 text-slate-600">{p.organizationName}</td>
                        <td className="px-5 py-3.5 whitespace-nowrap text-slate-600 sm:px-6">
                          <time dateTime={toIso(p.votedAt)}>{formatDateTime(p.votedAt)}</time>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}
    </Container>
  );
}
