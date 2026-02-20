import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { StudioShell } from "@/features/studio/studio-shell";
import { useEditorStore } from "@/stores/editor";

function StudioPage() {
  const { worldId } = Route.useParams();
  const { loadWorld, serverWorldId } = useEditorStore();

  useEffect(() => {
    // Only load if not already loaded (e.g., navigating from editor)
    if (serverWorldId !== worldId) {
      loadWorld(worldId);
    }
  }, [worldId, loadWorld, serverWorldId]);

  return <StudioShell />;
}

export const Route = createFileRoute("/app/studio/$worldId")({
  component: StudioPage,
});
