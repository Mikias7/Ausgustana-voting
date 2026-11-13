import { Button } from "../ui/Button";
import type { ElectionAction } from "./useElectionAction";

/**
 * Below 1024px: the primary action pinned to the bottom of the screen — above the mobile tab bar
 * (<768px) or near the bottom edge on tablets. The page reserves space for it (h-20 spacer).
 */
export function ElectionActionBar({ action }: { action: ElectionAction }) {
  if (!action.cta) return null;
  return (
    <div className="fixed inset-x-3 bottom-[calc(var(--tabbar-space)+8px)] z-30 mx-auto max-w-xl md:bottom-[max(16px,env(safe-area-inset-bottom))] lg:hidden">
      <div className="glass flex items-center gap-3 rounded-panel border border-hairline py-2 pr-2 pl-5 shadow-float">
        <p className="min-w-0 flex-1 truncate text-callout font-semibold text-ink" aria-hidden="true">
          {action.title}
        </p>
        <Button to={action.cta.to} className="shrink-0">
          {action.cta.label}
        </Button>
      </div>
    </div>
  );
}

