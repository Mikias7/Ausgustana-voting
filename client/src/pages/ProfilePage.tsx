import type { ReactNode } from "react";
import type { ProfileDto } from "@asa/shared";
import { Lock, Vote } from "lucide-react";
import { Link } from "react-router-dom";
import { Avatar } from "../components/ui/Avatar";
import { Button } from "../components/ui/Button";
import { Container } from "../components/ui/Container";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { GroupedList } from "../components/ui/GroupedList";
import { ListRow } from "../components/ui/ListRow";
import { Skeleton } from "../components/ui/Skeleton";
import { StatusIndicator } from "../components/ui/StatusIndicator";
import { useProfile } from "../hooks/useProfile";
import { usePageTitle } from "../hooks/usePageTitle";
import { formatDate, toIso } from "../utils/dates";
import { classStandingLabel, classStandingPlural, orgRoleLabel, platformRoleLabel } from "../utils/labels";
import { fullName } from "../utils/text";

function ProfileSkeleton() {
  return (
    <div className="space-y-10">
      <span className="sr-only" role="status">
        Loading your profile…
      </span>
      <div className="flex flex-col items-center gap-4">
        <Skeleton className="size-20 rounded-full" />
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-40" />
      </div>
      <Skeleton className="h-40 w-full rounded-row" />
      <Skeleton className="h-28 w-full rounded-row" />
    </div>
  );
}

/** Plain-language eligibility summary from roster status and class. */
function eligibilityText(profile: ProfileDto): string {
  if (!profile.onRoster) {
    return "You're not on the current university roster, so you can't vote right now. If you think this is wrong, contact ASA.";
  }
  const classPart = profile.classStanding
    ? ` and elections for ${classStandingPlural(profile.classStanding)}`
    : "";
  return `You're on the current roster, so you can vote in elections open to all students${classPart}. Some elections use a specific voter list.`;
}

function Value({ children }: { children: ReactNode }) {
  return <span className="text-callout text-ink-2">{children}</span>;
}

export function ProfilePage() {
  usePageTitle("My profile");
  const { data: profile, loading, error, reload } = useProfile();

  return (
    <Container size="reading">
      {loading && !profile ? (
        <ProfileSkeleton />
      ) : error || !profile ? (
        <ErrorState title="We couldn't load your profile" error={error} onRetry={reload} />
      ) : (
        <div className="space-y-10">
          <header className="flex flex-col items-center text-center">
            <Avatar
              name={fullName(profile)}
              size="xl"
              className={profile.onRoster ? "ring-2 ring-gold ring-offset-[3px] ring-offset-canvas" : undefined}
            />
            <h1 className="mt-5 text-large-title">{fullName(profile)}</h1>
            <p className="mt-1.5 text-callout break-all text-ink-2">{profile.email}</p>
            {profile.classStanding && (
              <p className="mt-3 rounded-full bg-gold-soft px-3 py-1 text-footnote text-navy-900">
                {classStandingLabel(profile.classStanding)}
              </p>
            )}
          </header>

          <GroupedList title="Student">
            <ListRow inlineTrailing title="Class" trailing={<Value>{classStandingLabel(profile.classStanding)}</Value>} />
            <ListRow inlineTrailing title="Username" trailing={<Value>@{profile.username}</Value>} />
            <ListRow
              inlineTrailing
              title="Roster status"
              trailing={
                profile.onRoster ? (
                  <StatusIndicator tone="success" label="On current roster" />
                ) : (
                  <StatusIndicator tone="muted" label="Not on current roster" />
                )
              }
            />
            <ListRow inlineTrailing title="Role" trailing={<Value>{platformRoleLabel(profile.platformRole)}</Value>} />
            {profile.orgRoles.map((r) => (
              <ListRow
                inlineTrailing
                key={`${r.organizationId}-${r.role}`}
                title={orgRoleLabel(r.role)}
                trailing={<Value>{r.organizationSlug}</Value>}
              />
            ))}
          </GroupedList>

          <section aria-labelledby="eligibility-heading">
            <h2 id="eligibility-heading" className="eyebrow mb-2.5 px-4">
              Eligibility
            </h2>
            <div className="rounded-row border border-hairline bg-surface px-4 py-3.5 text-callout text-ink-2">
              {eligibilityText(profile)}
              {!profile.onRoster && (
                <>
                  {" "}
                  <Link to="/contact" className="font-medium text-navy-900 underline underline-offset-2">
                    Contact ASA
                  </Link>
                </>
              )}
            </div>
          </section>

          {profile.participations.length === 0 ? (
            <section aria-labelledby="history-heading">
              <h2 id="history-heading" className="eyebrow mb-2.5 px-4">
                Voting history
              </h2>
              <div className="rounded-row border border-hairline bg-surface">
                <EmptyState
                  compact
                  icon={<Vote aria-hidden="true" />}
                  title="You haven't voted yet"
                  description="Elections you take part in will be listed here."
                  action={
                    <Button to="/elections" variant="tinted" size="sm">
                      See open elections
                    </Button>
                  }
                />
              </div>
            </section>
          ) : (
            <GroupedList title="Voting history">
              {profile.participations.map((p) => (
                <ListRow
                  key={p.electionId}
                  to={`/elections/${p.electionId}`}
                  title={p.electionTitle}
                  subtitle={
                    <>
                      {p.organizationName} · Voted <time dateTime={toIso(p.votedAt)}>{formatDate(p.votedAt)}</time>
                    </>
                  }
                />
              ))}
            </GroupedList>
          )}

          <p className="flex items-start justify-center gap-2 px-4 text-center text-footnote font-normal text-ink-2">
            <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            Your ballot choices are private and never shown — not to you, administrators, or anyone else.
          </p>
        </div>
      )}
    </Container>
  );
}
