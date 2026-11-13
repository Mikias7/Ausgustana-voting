import type { MyElectionStatus, PositionDto } from "@asa/shared";
import { BrandRule } from "../ui/BrandRule";
import { EmptyState } from "../ui/EmptyState";
import { PositionSection } from "./PositionSection";

interface PositionListProps {
  positions: PositionDto[];
  /** undefined when signed out. */
  myStatus: MyElectionStatus | undefined;
}

/**
 * Positions for the election page. When the signed-in voter is eligible for some but not all
 * positions, they're split into "On your ballot" then "Other positions"; otherwise the original
 * order is kept. Eligible positions always get the gold "On your ballot" marker.
 */
export function PositionList({ positions, myStatus }: PositionListProps) {
  if (positions.length === 0) {
    return <EmptyState compact title="No positions listed yet" description="Check back closer to the election." />;
  }

  const eligibleIds = new Set(myStatus?.eligiblePositionIds ?? []);
  const canVote = (p: PositionDto) => (myStatus ? eligibleIds.has(p.id) : undefined);
  const mine = positions.filter((p) => eligibleIds.has(p.id));
  const others = positions.filter((p) => !eligibleIds.has(p.id));

  if (!myStatus || mine.length === 0 || others.length === 0) {
    return (
      <div>
        {positions.map((p) => (
          <PositionSection key={p.id} position={p} canVote={canVote(p)} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <section aria-labelledby="ballot-positions-heading">
        <h3 id="ballot-positions-heading" className="eyebrow mb-6 flex items-center gap-2">
          <BrandRule size="sm" />
          On your ballot <span className="tabular">({mine.length})</span>
        </h3>
        <div>
          {mine.map((p) => (
            <PositionSection key={p.id} position={p} canVote headingLevel="h4" />
          ))}
        </div>
      </section>
      <section aria-labelledby="other-positions-heading">
        <div className="mb-6">
          <h3 id="other-positions-heading" className="eyebrow">
            Other positions <span className="tabular">({others.length})</span>
          </h3>
          <p className="mt-2 text-footnote font-normal text-ink-2">Open to other classes or voter lists.</p>
        </div>
        <div>
          {others.map((p) => (
            <PositionSection key={p.id} position={p} canVote={false} headingLevel="h4" />
          ))}
        </div>
      </section>
    </div>
  );
}
