import { Button } from "../components/ui/Button";
import { Container } from "../components/ui/Container";
import { usePageTitle } from "../hooks/usePageTitle";

export function NotFoundPage() {
  usePageTitle("Page not found");
  return (
    <Container size="reading" className="flex flex-1 flex-col items-center justify-center py-10 text-center">
      <p aria-hidden="true" className="text-[clamp(6rem,4rem+10vw,10rem)] leading-none font-semibold tracking-[-0.05em] text-navy-100 tabular">
        404
      </p>
      <h1 className="mt-6 text-title-2">We couldn&apos;t find that page</h1>
      <p className="mt-2 text-callout text-ink-2">The link may be broken, or the page may have moved.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button to="/">Go home</Button>
        <Button to="/elections" variant="tinted">
          Browse elections
        </Button>
      </div>
    </Container>
  );
}
