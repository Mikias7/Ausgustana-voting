import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "../../utils/cn";

export interface SegmentItem<T extends string = string> {
  id: T;
  label: ReactNode;
  /** Optional count shown after the label. */
  count?: number;
}

interface SegmentedControlProps<T extends string> {
  /** Unique base id; links segments to their panels (see TabPanel). */
  id: string;
  /** Accessible name for the tab list. */
  label: string;
  items: ReadonlyArray<SegmentItem<T>>;
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

export const tabId = (base: string, value: string) => `${base}-tab-${value}`;
export const panelId = (base: string, value: string) => `${base}-panel-${value}`;

/**
 * Segmented control with WAI-ARIA tabs semantics (automatic activation):
 * role=tablist/tab, roving tabindex, ← → Home End with wrap-around, aria-selected / aria-controls.
 * A white thumb slides under the selected segment. Controlled — pair with `useSearchParamState`.
 */
export function SegmentedControl<T extends string>({
  id,
  label,
  items,
  value,
  onChange,
  className,
}: SegmentedControlProps<T>) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const selectedIndex = Math.max(
    0,
    items.findIndex((item) => item.id === value),
  );

  function focusAndSelect(index: number) {
    const wrapped = (index + items.length) % items.length;
    onChange(items[wrapped].id);
    refs.current[wrapped]?.focus();
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const targets: Record<string, number> = {
      ArrowRight: index + 1,
      ArrowLeft: index - 1,
      Home: 0,
      End: items.length - 1,
    };
    if (!(event.key in targets)) return;
    event.preventDefault();
    focusAndSelect(targets[event.key]);
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn("relative inline-grid h-11 rounded-control bg-inset p-1 sm:h-9", className)}
      style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}
    >
      <span
        aria-hidden="true"
        className="absolute top-1 bottom-1 left-1 rounded-[8px] bg-surface shadow-thumb transition-transform duration-240 ease-apple"
        style={{
          width: `calc((100% - 0.5rem) / ${items.length})`,
          transform: `translateX(${selectedIndex * 100}%)`,
        }}
      />
      {items.map((item, index) => {
        const selected = item.id === value;
        return (
          <button
            key={item.id}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="button"
            role="tab"
            id={tabId(id, item.id)}
            aria-selected={selected}
            aria-controls={panelId(id, item.id)}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(item.id)}
            onKeyDown={(e) => onKeyDown(e, index)}
            className={cn(
              "relative z-10 inline-flex items-center justify-center gap-1.5 rounded-[8px] px-4 text-[0.875rem] whitespace-nowrap transition-colors duration-160",
              "focus-visible:outline-offset-0",
              selected ? "font-semibold text-ink" : "font-medium text-ink-2 hover:text-ink",
            )}
          >
            {item.label}
            {item.count !== undefined && <span className="tabular text-ink-2">{item.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
