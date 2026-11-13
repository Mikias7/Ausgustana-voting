import { Vote } from "lucide-react";
import { ElectionSubpage } from "./ElectionSubpage";

/** /elections/:id/vote — ballot → review → confirm. Built in feature/voting. */
export function VotePage() {
  return (
    <ElectionSubpage
      title="Cast your ballot"
      description="You'll see only the positions you're eligible for, review your choices, then confirm."
      icon={<Vote className="size-6" aria-hidden="true" />}
      comingSoon="Online ballots are being built in the next phase. Your eligibility and the candidates are already listed on the election page."
    />
  );
}
