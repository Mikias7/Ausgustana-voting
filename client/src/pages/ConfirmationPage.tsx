import { Receipt } from "lucide-react";
import { ElectionSubpage } from "./ElectionSubpage";

/** /elections/:id/confirmation — shows the voter's receipt code. Built in feature/voting. */
export function ConfirmationPage() {
  return (
    <ElectionSubpage
      title="Vote confirmation"
      description="After you vote, your receipt code appears here. It proves your ballot was recorded — without revealing your choices."
      icon={<Receipt className="size-6" aria-hidden="true" />}
      comingSoon="Ballot receipts arrive together with online voting in the next phase."
    />
  );
}
