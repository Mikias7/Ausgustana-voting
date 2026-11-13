import type { ReactNode } from "react";
import { cn } from "../../utils/cn";
import { panelId, tabId } from "./SegmentedControl";

interface TabPanelProps {
  /** Same `id` given to <SegmentedControl>. */
  tabsId: string;
  value: string;
  className?: string;
  children: ReactNode;
}

/** Panel controlled by a SegmentedControl segment (role="tabpanel"). */
export function TabPanel({ tabsId, value, className, children }: TabPanelProps) {
  return (
    <div
      role="tabpanel"
      id={panelId(tabsId, value)}
      aria-labelledby={tabId(tabsId, value)}
      tabIndex={0}
      className={cn("rounded-row focus-visible:outline-offset-4", className)}
    >
      {children}
    </div>
  );
}
