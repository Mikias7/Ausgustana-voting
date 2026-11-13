import { useState, type FormEvent } from "react";
import type { ReceiptCheck } from "@asa/shared";
import { Receipt } from "lucide-react";
import { Link } from "react-router-dom";
import { checkReceipt } from "../api/elections";
import { Alert } from "../components/ui/Alert";
import { Button } from "../components/ui/Button";
import { Container } from "../components/ui/Container";
import { PageHeader } from "../components/ui/PageHeader";
import { usePageTitle } from "../hooks/usePageTitle";

/** /receipt — anyone can confirm a receipt code matches a recorded ballot (choices are never shown). */
export function ReceiptCheckPage() {
  usePageTitle("Check a receipt");
  const [code, setCode] = useState("");
  const [result, setResult] = useState<ReceiptCheck | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      setResult(await checkReceipt(code));
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Container size="compact">
      <PageHeader
        title="Check a receipt"
        description="Enter the code you got after voting to confirm your ballot was recorded. Your choices are never shown."
      />
      <form onSubmit={onSubmit} className="rounded-panel border border-hairline bg-surface p-5 sm:p-6">
        <label htmlFor="receipt-code" className="text-footnote text-ink">
          Receipt code
        </label>
        <input
          id="receipt-code"
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            setResult(null);
          }}
          placeholder="XXXX-XXXX-XXXX"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={40}
          className="mt-1.5 h-12 w-full rounded-input border border-hairline-strong bg-surface px-4 font-mono text-body tracking-[0.06em] text-ink uppercase placeholder:text-ink-3 focus:border-navy-900 focus:ring-2 focus:ring-navy-900/15 focus:outline-none"
        />
        <Button
          type="submit"
          fullWidth
          className="mt-4"
          loading={loading}
          disabled={!code.trim()}
          leftIcon={<Receipt className="size-4" aria-hidden="true" />}
        >
          Check receipt
        </Button>
      </form>

      <div aria-live="polite" className="mt-6">
        {result?.recorded && result.election && (
          <Alert tone="success" title="Ballot recorded">
            This code matches a ballot in{" "}
            <Link to={`/elections/${result.election.id}`} className="font-medium text-navy-900 underline underline-offset-2">
              {result.election.title}
            </Link>
            .
          </Alert>
        )}
        {result && !result.recorded && (
          <Alert tone="warning" title="No ballot found">
            Check the code for typos. Codes use letters and the digits 2–9 (no 0, 1, I, L or O).
          </Alert>
        )}
        {error !== null && (
          <Alert tone="error" title="We couldn't check that code">
            {error instanceof Error ? error.message : "Please try again."}
          </Alert>
        )}
      </div>
    </Container>
  );
}
