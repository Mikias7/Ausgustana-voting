import { Card } from "../ui/Card";
import { Skeleton } from "../ui/Skeleton";

export function ElectionCardSkeleton() {
  return (
    <Card padding="md" className="flex h-full flex-col gap-3">
      <div className="flex justify-between">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="mt-4 h-4 w-40" />
    </Card>
  );
}
