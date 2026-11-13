import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
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
    <Container size="md" className="py-10 sm:py-14">
      <PageHeader
        breadcrumb={
          <Link
            to={`/elections/${id ?? ""}`}
            className="inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-augie-blue-700 hover:text-augie-blue-900"
          >
            <ArrowLeft className="size-4" aria-hidden="true" /> Back to election
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
          <Button to={`/elections/${id ?? ""}`} variant="secondary">
            View election details
          </Button>
        }
      />
    </Container>
  );
}
