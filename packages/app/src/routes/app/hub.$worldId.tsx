import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";

const WorldDetail = lazy(() =>
  import("@/features/hub/world-detail").then((m) => ({
    default: m.WorldDetail,
  }))
);

function WorldDetailPage() {
  const { worldId } = Route.useParams();
  return (
    <Suspense fallback={<Loading />}>
      <WorldDetail worldId={worldId} />
    </Suspense>
  );
}

export const Route = createFileRoute("/app/hub/$worldId")({
  component: WorldDetailPage,
});

function Loading() {
  return (
    <div className="flex h-full items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/40" />
    </div>
  );
}
