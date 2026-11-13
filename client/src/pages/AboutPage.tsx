import type { ReactNode } from "react";
import { ArrowUpRight, GraduationCap, Lock, ShieldCheck, type LucideIcon } from "lucide-react";
import { ASA_CONTACT, BRAND } from "../components/layout/brand";
import { Button, buttonClasses } from "../components/ui/Button";
import { Container } from "../components/ui/Container";
import { usePageTitle } from "../hooks/usePageTitle";

function Topic({ id, icon: Icon, title, children }: { id: string; icon: LucideIcon; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="grid gap-4 border-t border-hairline pt-10 sm:grid-cols-[3rem_minmax(0,1fr)] sm:gap-6">
      <span className="flex size-12 items-center justify-center rounded-full bg-navy-50 text-navy-900">
        <Icon className="size-6" strokeWidth={1.5} aria-hidden="true" />
      </span>
      <div>
        <h2 id={id} className="text-title-2">
          {title}
        </h2>
        <div className="mt-4 space-y-4 text-body text-ink-2">{children}</div>
      </div>
    </section>
  );
}

export function AboutPage() {
  usePageTitle("About");
  return (
    <Container size="reading">
      <header>
        <p className="eyebrow">{BRAND.orgName}</p>
        <h1 className="mt-3 text-large-title">About ASA Elections</h1>
        <p className="mt-6 text-[1.25rem] leading-relaxed tracking-[-0.01em] text-ink">
          ASA Elections is the online voting platform for student government and student organizations at{" "}
          {BRAND.university}. It exists so that every election is fair, private, and easy to take part in.
        </p>
      </header>

      <div className="mt-14 space-y-12">
        <Topic id="eligibility-heading" icon={GraduationCap} title="Eligibility">
          <p>
            Only current Augustana students on the university roster can vote. ASA updates the roster from official
            university records.
          </p>
          <p>
            Some seats are for a specific class — for example, only freshmen vote for Freshman Senator. Others, like
            At-Large Senator, are open to everyone. Your ballot automatically shows only the positions you&apos;re
            eligible for.
          </p>
        </Topic>

        <Topic id="privacy-heading" icon={Lock} title="Privacy">
          <p>
            Your ballot is secret. The system records <em>that</em> you voted — so nobody can vote twice — separately
            from <em>what</em> you voted. Ballots carry no name, username, or timestamp.
          </p>
          <p>
            Election administrators see turnout and final totals, never individual ballots or who chose whom. When
            very few people vote for a position, administrators are warned before publishing so totals don&apos;t
            reveal individual choices. Please don&apos;t put identifying information in write-in answers.
          </p>
        </Topic>

        <Topic id="integrity-heading" icon={ShieldCheck} title="Integrity">
          <p>
            You submit one ballot per election, covering every position you can vote for. Once submitted it
            can&apos;t be changed, so review your choices before you confirm.
          </p>
          <p>
            After voting you receive a random receipt code. It proves your ballot was recorded without revealing who
            you voted for.
          </p>
        </Topic>

        <section aria-labelledby="asa-heading" className="border-t border-hairline pt-10">
          <div className="flex items-center gap-4">
            <img src={BRAND.logo} alt="" className="size-12" width={48} height={48} />
            <h2 id="asa-heading" className="text-title-3">
              Run by the {BRAND.orgName}
            </h2>
          </div>
          <p className="mt-4 text-body text-ink-2">
            ASA is the student government of Augustana University. It represents every student, works with
            university leadership, and supports student organizations across campus. Organizations manage their own
            elections; ASA oversees the platform and the student roster.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button to="/contact">Contact ASA</Button>
            <a href={ASA_CONTACT.website} target="_blank" rel="noreferrer" className={buttonClasses("tinted")}>
              ASA on augie.edu
              <ArrowUpRight className="size-4" aria-hidden="true" />
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </div>
        </section>
      </div>
    </Container>
  );
}
