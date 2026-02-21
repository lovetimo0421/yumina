import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useEditorStore } from "@/stores/editor";

const EditorShell = lazy(() =>
  import("@/features/editor/editor-shell").then((m) => ({
    default: m.EditorShell,
  }))
);

function WorldEditPage() {
  const { worldId } = Route.useParams();
  const { loadWorld } = useEditorStore();

  useEffect(() => {
    loadWorld(worldId);
  }, [worldId, loadWorld]);

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <EditorShell />
    </Suspense>
  );
}

export const Route = createFileRoute("/app/worlds/$worldId/edit")({
  component: WorldEditPage,
});

function LoadingSpinner() {
  return (
    <div className="flex h-full items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/40" />
    </div>
  );
}
