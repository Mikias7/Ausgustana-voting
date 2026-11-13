import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { ComingSoon } from "../components/layout/ComingSoon";
import { Button } from "../components/ui/Button";
import { Container } from "../components/ui/Container";
import { PageHeader } from "../components/ui/PageHeader";
import { useElection } from "../hooks/useElection";
import { usePageTitle } from "../hooks/usePageTitle";

interface ElectionSubpageProps {
  title: string;
  description: ReactNode;
  icon: ReactNode;
  comingSoon: ReactNode;
}

/**
 * Shared shell for /elections/:id/vote, /confirmation and /results while those
 * features are being built: shows the election name and an intentional placeholder.
 */
export function ElectionSubpage({ title, description, icon, comingSoon }: ElectionSubpageProps) {
  const { id } = useParams<{ id: string }>();
  const { data: election, loading } = useElection(id);
  usePageTitle(election ? `${title} · ${election.title}` : title);

  return (
    <Container size="narrow">
      <PageHeader
        breadcrumb={
          <Link
            to={`/elections/${id ?? ""}`}
            className="-ml-2 inline-flex min-h-11 items-center gap-0.5 rounded-full pr-3 pl-1 text-callout font-medium text-navy-900 transition-colors duration-160 hover:text-navy-600"
          >
            <ChevronLeft className="size-[18px]" aria-hidden="true" /> Election
          </Link>
        }
        eyebrow={loading && !election ? "Loading…" : (election?.title ?? "Election")}
        title={title}
        description={description}
      />
      <ComingSoon
        icon={icon}
        description={comingSoon}
        action={
          <Button to={`/elections/${id ?? ""}`} variant="tinted">
            View election details
          </Button>
        }
      />
    </Container>
  );
}
