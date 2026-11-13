import type { ReactNode } from "react";
import { ExternalLink, GraduationCap, Lock, Receipt, ShieldCheck, UserCheck, Users } from "lucide-react";
import { ASA_CONTACT, BRAND } from "../components/layout/brand";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Container } from "../components/ui/Container";
import { PageHeader } from "../components/ui/PageHeader";
import { usePageTitle } from "../hooks/usePageTitle";

function Feature({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <Card as="article" className="h-full">
      <div className="mb-4 flex size-11 items-center justify-center rounded-lg bg-augie-blue text-augie-gold">{icon}</div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <div className="mt-2 space-y-2 text-sm leading-relaxed text-slate-600">{children}</div>
    </Card>
  );
}

export function AboutPage() {
  usePageTitle("About");
  const iconClass = "size-5";
  return (
    <Container className="py-10 sm:py-14">
      <PageHeader
        eyebrow={BRAND.orgName}
        title="About ASA Elections"
        description="ASA Elections is the online voting platform for student government and student organizations at Augustana University."
      />

      <div className="grid gap-10 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-12">
          <section aria-labelledby="asa-heading" className="max-w-prose">
            <h2 id="asa-heading" className="text-2xl font-semibold">
              Run by the Augustana Student Association
            </h2>
            <div className="mt-4 space-y-4 leading-relaxed text-slate-700">
              <p>
                The Augustana Student Association (ASA) is the student government of Augustana University. ASA
                represents every student, works with university leadership, and supports student organizations
                across campus.
              </p>
              <p>
                ASA operates this platform so that ASA Senate and executive elections — and elections held by other
                student organizations — are fair, accessible, and easy to take part in. Organizations manage their
                own elections; ASA oversees the platform and the student roster.
              </p>
            </div>
          </section>

          <section aria-labelledby="how-heading">
            <h2 id="how-heading" className="text-2xl font-semibold">
              How voting works
            </h2>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <Feature icon={<UserCheck className={iconClass} aria-hidden="true" />} title="Sign in with your account">
                <p>
                  Only current Augustana students on the university roster can vote. The roster is updated by ASA
                  from official university records.
                </p>
              </Feature>
              <Feature icon={<GraduationCap className={iconClass} aria-hidden="true" />} title="Class-based eligibility">
                <p>
                  Some seats are for a specific class — for example, only freshmen vote for Freshman Senator. Other
                  seats, like At-Large Senator, are open to everyone.
                </p>
                <p>Your ballot automatically shows only the positions you're eligible for.</p>
              </Feature>
              <Feature icon={<Users className={iconClass} aria-hidden="true" />} title="One ballot per election">
                <p>
                  You submit one ballot per election, covering every position you can vote for. Once submitted, it
                  can't be changed — so review your choices before you confirm.
                </p>
              </Feature>
              <Feature icon={<Receipt className={iconClass} aria-hidden="true" />} title="A receipt for your vote">
                <p>
                  After voting you receive a random receipt code. It proves your ballot was recorded without
                  revealing who you voted for.
                </p>
              </Feature>
            </div>
          </section>

          <section aria-labelledby="privacy-heading" className="rounded-2xl bg-augie-blue p-6 text-white sm:p-8 on-dark">
            <div className="flex items-center gap-3">
              <Lock className="size-6 text-augie-gold" aria-hidden="true" />
              <h2 id="privacy-heading" className="text-2xl font-semibold text-white">
                Your ballot is secret
              </h2>
            </div>
            <ul className="mt-5 space-y-3 text-sm leading-relaxed text-augie-blue-100">
              <li className="flex gap-3">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-augie-gold" aria-hidden="true" />
                <span>
                  The system records <strong className="text-white">that</strong> you voted (so nobody can vote
                  twice) separately from <strong className="text-white">what</strong> you voted. Ballots carry no
                  name, username, or timestamp.
                </span>
              </li>
              <li className="flex gap-3">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-augie-gold" aria-hidden="true" />
                <span>
                  Election administrators see turnout numbers and final totals — never individual ballots or who
                  chose whom.
                </span>
              </li>
              <li className="flex gap-3">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-augie-gold" aria-hidden="true" />
                <span>
                  Results are only shown as totals. When very few people vote for a position, administrators are
                  warned before publishing so that totals don't reveal individual choices.
                </span>
              </li>
              <li className="flex gap-3">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-augie-gold" aria-hidden="true" />
                <span>Please don't put identifying information in write-in answers.</span>
              </li>
            </ul>
          </section>
        </div>

        <aside className="space-y-5">
          <Card className="lg:sticky lg:top-28">
            <img src={BRAND.logo} alt={`${BRAND.orgName} logo`} className="size-16" width={64} height={64} />
            <h2 className="mt-4 text-lg font-semibold">Questions about an election?</h2>
            <p className="mt-2 text-sm text-slate-600">
              Contact ASA at{" "}
              <a href={`mailto:${ASA_CONTACT.email}`} className="font-medium text-augie-blue-700 underline">
                {ASA_CONTACT.email}
              </a>{" "}
              or {ASA_CONTACT.phone}.
            </p>
            <div className="mt-5 flex flex-col gap-2">
              <Button to="/contact" fullWidth>
                Contact ASA
              </Button>
              <a
                href={ASA_CONTACT.website}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-augie-blue-700 hover:bg-augie-blue-50"
              >
                ASA on augie.edu <ExternalLink className="size-4" aria-hidden="true" />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            </div>
          </Card>
        </aside>
      </div>
    </Container>
  );
}
