import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { EditorShell } from "@/features/editor/editor-shell";
import { useEditorStore } from "@/stores/editor";

function WorldEditPage() {
  const { worldId } = Route.useParams();
  const { loadWorld } = useEditorStore();

  useEffect(() => {
    loadWorld(worldId);
  }, [worldId, loadWorld]);

  return <EditorShell />;
}

export const Route = createFileRoute("/app/worlds/$worldId/edit")({
  component: WorldEditPage,
});
