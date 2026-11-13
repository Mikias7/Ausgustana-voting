import type { ReactNode } from "react";
import { Hourglass } from "lucide-react";
import { EmptyState } from "../ui/EmptyState";

interface ComingSoonProps {
  title?: string;
  description?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
}

/** Intentional placeholder for routes whose feature lands in a later phase. */
export function ComingSoon({
  title = "Coming in the next phase",
  description = "This part of ASA Elections is planned and will be available soon.",
  action,
  icon,
}: ComingSoonProps) {
  return (
    <div className="rounded-panel border border-hairline bg-surface">
      <EmptyState
        eyebrow="Coming soon"
        icon={icon ?? <Hourglass aria-hidden="true" />}
        title={title}
        description={description}
        action={action}
      />
    </div>
  );
}
