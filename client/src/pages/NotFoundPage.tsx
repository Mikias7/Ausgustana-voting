import { FileQuestion } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Container } from "../components/ui/Container";
import { EmptyState } from "../components/ui/EmptyState";
import { usePageTitle } from "../hooks/usePageTitle";

export function NotFoundPage() {
  usePageTitle("Page not found");
  return (
    <Container size="sm" className="py-16 sm:py-24">
      <p className="mb-4 text-center font-serif text-6xl font-semibold text-augie-blue-200">404</p>
      <EmptyState
        icon={<FileQuestion className="size-6" aria-hidden="true" />}
        title="We couldn't find that page"
        description="The link may be broken, or the page may have moved."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button to="/">Go home</Button>
            <Button to="/elections" variant="secondary">
              Browse elections
            </Button>
          </div>
        }
      />
    </Container>
  );
}
