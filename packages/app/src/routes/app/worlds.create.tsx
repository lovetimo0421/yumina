import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { EditorShell } from "@/features/editor/editor-shell";
import { useEditorStore } from "@/stores/editor";

function WorldCreatePage() {
  const { createNew } = useEditorStore();

  useEffect(() => {
    createNew();
  }, [createNew]);

  return <EditorShell />;
}

export const Route = createFileRoute("/app/worlds/create")({
  component: WorldCreatePage,
});
