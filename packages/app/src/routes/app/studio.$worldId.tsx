import { createFileRoute } from "@tanstack/react-router";
import { Suspense, lazy, useEffect } from "react";
import { useEditorStore } from "@/stores/editor";
import { Loader2 } from "lucide-react";

const StudioShell = lazy(() =>
  import("@/features/studio/studio-shell").then((m) => ({
    default: m.StudioShell,
  }))
);

function StudioLoading() {
  return (
    <div className="flex h-full items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="text-sm">Loading Studio...</span>
      </div>
    </div>
  );
}

function StudioPage() {
  const { worldId } = Route.useParams();
  const { loadWorld, serverWorldId } = useEditorStore();

  useEffect(() => {
    if (serverWorldId !== worldId) {
      loadWorld(worldId);
    }
  }, [worldId, loadWorld, serverWorldId]);

  return (
    <Suspense fallback={<StudioLoading />}>
      <StudioShell />
    </Suspense>
  );
}

export const Route = createFileRoute("/app/studio/$worldId")({
  component: StudioPage,
});
