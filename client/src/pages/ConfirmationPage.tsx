import { useEffect, useState } from "react";
import { Check, CircleCheck, Copy, Receipt } from "lucide-react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { BrandPanel } from "../components/ui/BrandPanel";
import { Button } from "../components/ui/Button";
import { Container } from "../components/ui/Container";
import { EmptyState } from "../components/ui/EmptyState";
import { usePageTitle } from "../hooks/usePageTitle";
import type { ConfirmationState } from "./VotePage";

function isConfirmationState(value: unknown): value is ConfirmationState {
  return typeof (value as ConfirmationState | null)?.receiptCode === "string";
}

/**
 * /elections/:id/confirmation — shown once, right after voting. The receipt code
 * only lives in this page's navigation state; the server keeps just its hash.
 */
export function ConfirmationPage() {
  const { id = "" } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  // Keep the receipt in memory only, then wipe it from browser history so it can't be
  // recovered later with Back/Forward or a reload (e.g. on a shared lab computer).
  const [state] = useState(() => (isConfirmationState(location.state) ? location.state : null));
  const [copied, setCopied] = useState(false);
  usePageTitle("Vote recorded");

  useEffect(() => {
    if (location.state) navigate(".", { replace: true, state: null });
  }, [location.state, navigate]);

  if (!state) {
    return (
      <Container size="narrow">
        <EmptyState
          icon={<Receipt aria-hidden="true" />}
          title="Receipt codes are shown only once"
          description="For your privacy, the code appears right after you vote and isn't stored anywhere we can show it again. If you saved it, you can still check it."
          action={
            <div className="flex flex-wrap justify-center gap-3">
              <Button to="/receipt" variant="secondary">
                Check a receipt
              </Button>
              <Button to={`/elections/${id}`} variant="ghost">
                Back to the election
              </Button>
            </div>
          }
        />
      </Container>
    );
  }

  const receipt = state;

  async function copy() {
    try {
      await navigator.clipboard.writeText(receipt.receiptCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked; the code is selectable as plain text.
    }
  }

  return (
    <Container size="compact" className="pt-4 sm:pt-10">
      <div className="text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-success/10 text-success">
          <CircleCheck className="size-7" strokeWidth={1.75} aria-hidden="true" />
        </div>
        <p className="eyebrow mt-6">{state.electionTitle}</p>
        <h1 className="mt-2 text-large-title">Your vote is in</h1>
        <p className="mt-3 text-body text-ink-2">Thank you for voting. Your ballot was recorded anonymously.</p>
      </div>

      <BrandPanel as="section" aria-labelledby="receipt-heading" className="mt-10 p-6 text-center">
        <h2 id="receipt-heading" className="text-footnote font-semibold tracking-wide text-navy-200 uppercase">
          Receipt code
        </h2>
        <p className="mt-3 font-mono text-[1.75rem] leading-tight font-semibold tracking-[0.08em] text-white select-all sm:text-[2rem]">
          {state.receiptCode}
        </p>
        <Button
          variant="gold"
          size="sm"
          onClick={copy}
          className="mt-5"
          leftIcon={copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
        >
          {copied ? "Copied" : "Copy code"}
        </Button>
        <span className="sr-only" aria-live="polite">
          {copied ? "Receipt code copied" : ""}
        </span>
      </BrandPanel>

      <ul className="mt-6 space-y-2 text-callout text-ink-2">
        <li>• Save this code now. It&apos;s shown only once and can&apos;t be recovered.</li>
        <li>
          • It proves your ballot was counted, without revealing your choices.{" "}
          <Link to="/receipt" className="font-medium text-navy-900 underline underline-offset-2">
            Check a receipt
          </Link>
        </li>
      </ul>

      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <Button to={`/elections/${id}`} variant="secondary">
          Back to the election
        </Button>
        <Button to="/elections" variant="ghost">
          All elections
        </Button>
      </div>
    </Container>
  );
}
