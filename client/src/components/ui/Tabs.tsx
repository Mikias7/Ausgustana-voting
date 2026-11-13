import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "../../utils/cn";

export interface TabItem<T extends string = string> {
  id: T;
  label: ReactNode;
  /** Optional count shown in a small pill after the label. */
  count?: number;
}

interface TabsProps<T extends string> {
  /** Unique base id; links tabs to their panels (see TabPanel). */
  id: string;
  /** Accessible name for the tab list. */
  label: string;
  tabs: ReadonlyArray<TabItem<T>>;
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

export const tabId = (base: string, value: string) => `${base}-tab-${value}`;
export const panelId = (base: string, value: string) => `${base}-panel-${value}`;

/**
 * Accessible tabs (WAI-ARIA tabs pattern, automatic activation):
 * roving tabindex, ← → Home End keys, aria-selected / aria-controls.
 * Controlled — pair with `useSearchParamState` for URL-driven tabs.
 */
export function Tabs<T extends string>({ id, label, tabs, value, onChange, className }: TabsProps<T>) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  function focusAndSelect(index: number) {
    const tab = tabs[(index + tabs.length) % tabs.length];
    onChange(tab.id);
    refs.current[(index + tabs.length) % tabs.length]?.focus();
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    switch (event.key) {
      case "ArrowRight":
        event.preventDefault();
        focusAndSelect(index + 1);
        break;
      case "ArrowLeft":
        event.preventDefault();
        focusAndSelect(index - 1);
        break;
      case "Home":
        event.preventDefault();
        focusAndSelect(0);
        break;
      case "End":
        event.preventDefault();
        focusAndSelect(tabs.length - 1);
        break;
    }
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn("flex gap-1 overflow-x-auto border-b border-slate-200", className)}
    >
      {tabs.map((tab, index) => {
        const selected = tab.id === value;
        return (
          <button
            key={tab.id}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="button"
            role="tab"
            id={tabId(id, tab.id)}
            aria-selected={selected}
            aria-controls={panelId(id, tab.id)}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(e) => onKeyDown(e, index)}
            className={cn(
              "-mb-px inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors",
              selected
                ? "border-augie-gold-500 text-augie-blue"
                : "border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900",
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs",
                  selected ? "bg-augie-blue text-white" : "bg-slate-100 text-slate-600",
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

interface TabPanelProps {
  /** Same `id` given to <Tabs>. */
  tabsId: string;
  value: string;
  className?: string;
  children: ReactNode;
}

export function TabPanel({ tabsId, value, className, children }: TabPanelProps) {
  return (
    <div
      role="tabpanel"
      id={panelId(tabsId, value)}
      aria-labelledby={tabId(tabsId, value)}
      tabIndex={0}
      className={cn("focus-visible:outline-offset-4", className)}
    >
      {children}
    </div>
  );
}
