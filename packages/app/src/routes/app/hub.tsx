import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";

const ContentHub = lazy(() =>
  import("@/features/hub/content-hub").then((m) => ({
    default: m.ContentHub,
  }))
);

function HubPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ContentHub />
    </Suspense>
  );
}

export const Route = createFileRoute("/app/hub")({
  component: HubPage,
});

function Loading() {
  return (
    <div className="flex h-full items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/40" />
    </div>
  );
}
