import type { ElectionDetail } from "@asa/shared";
import { BrandPanel } from "../ui/BrandPanel";
import { Button } from "../ui/Button";
import { StatusIndicator } from "../ui/StatusIndicator";
import { cn } from "../../utils/cn";
import { formatDateTime, timeUntil, toIso } from "../../utils/dates";
import { timingFor } from "./ElectionTiming";
import type { ElectionAction } from "./useElectionAction";

interface ElectionActionPanelProps {
  election: ElectionDetail;
  action: ElectionAction;
}

/**
 * The election's action panel: status, time remaining, what you can do, primary CTA, dates.
 * Navy brand surface with a gold button when the voter can vote now; a light panel otherwise.
 * Sticky in the aside on ≥1024px; below that it sits in the flow and the CTA moves to the bottom bar.
 */
export function ElectionActionPanel({ election, action }: ElectionActionPanelProps) {
  const { prefix, date } = timingFor(election);
  const remaining = election.phase === "open" || election.phase === "upcoming" ? timeUntil(date) : null;
  const dark = Boolean(action.prominent);

  const content = (
    <>
      <div className="flex items-center justify-between gap-3">
        <StatusIndicator phase={election.phase} onDark={dark} />
        {remaining && (
          <p className={cn("text-footnote tabular", dark ? "text-navy-200" : "text-ink-2")}>
            {prefix} in <span className={dark ? "text-white" : undefined}>{remaining}</span>
          </p>
        )}
      </div>
      <h2 id="action-heading" className={cn("mt-5 text-title-3", dark && "text-white")}>
        {action.title}
      </h2>
      {action.body && <p className={cn("mt-1.5 text-callout", dark ? "text-navy-200" : "text-ink-2")}>{action.body}</p>}
      {action.cta && (
        <Button
          to={action.cta.to}
          variant={dark ? "gold" : "primary"}
          fullWidth
          size="lg"
          className="mt-6 hidden lg:inline-flex"
        >
          {action.cta.label}
        </Button>
      )}

      <dl
        className={cn(
          "mt-6 grid grid-cols-2 gap-4 border-t pt-5 lg:grid-cols-1",
          dark ? "border-white/10" : "border-hairline",
        )}
      >
        {[
          { label: "Opens", value: election.startsAt },
          { label: "Closes", value: election.endsAt },
        ].map((row) => (
          <div key={row.label}>
            <dt className={cn("text-footnote", dark ? "text-navy-300" : "text-ink-2")}>{row.label}</dt>
            <dd className={cn("mt-0.5 text-callout", dark ? "text-white" : "text-ink")}>
              <time dateTime={toIso(row.value)}>{formatDateTime(row.value)}</time>
            </dd>
          </div>
        ))}
      </dl>
    </>
  );

  if (dark) {
    return (
      <BrandPanel as="section" aria-labelledby="action-heading" className="p-6">
        {content}
      </BrandPanel>
    );
  }
  return (
    <section aria-labelledby="action-heading" className="rounded-panel border border-hairline bg-surface p-6">
      {content}
    </section>
  );
}
