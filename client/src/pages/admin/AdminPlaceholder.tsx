import type { ReactNode } from "react";
import { ComingSoon } from "../../components/layout/ComingSoon";
import { PageHeader } from "../../components/ui/PageHeader";
import { usePageTitle } from "../../hooks/usePageTitle";

interface AdminPlaceholderProps {
  title: string;
  description: ReactNode;
  icon: ReactNode;
  /** What this section will do — shown in the placeholder. */
  planned: ReactNode;
}

/** Shared shell for admin sections that land in later feature branches. */
export function AdminPlaceholder({ title, description, icon, planned }: AdminPlaceholderProps) {
  usePageTitle(`${title} · Admin`);
  return (
    <>
      <PageHeader title={title} description={description} />
      <ComingSoon icon={icon} description={planned} />
    </>
  );
}
