import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { useChatStore } from "@/stores/chat";
import { useEditorStore } from "@/stores/editor";
import { useWorldsStore } from "@/stores/worlds";

const EditorShell = lazy(() =>
  import("@/features/editor/editor-shell").then((m) => ({
    default: m.EditorShell,
  }))
);

export function WorldInfoPage() {
  const session = useChatStore((s) => s.session);
  const { isDirty, saveDraft, loadWorld, serverWorldId } = useEditorStore();
  const { worlds, fetchWorlds } = useWorldsStore();
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const loadedWorldIdRef = useRef<string | null>(null);

  // Auto-save debounce
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!isDirty) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveDraft();
    }, 3000);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [isDirty, saveDraft]);

  // Auto-load world from active session
  useEffect(() => {
    const worldId = session?.worldId;
    if (!worldId) return;
    // Don't reload if we already loaded this world
    if (loadedWorldIdRef.current === worldId) return;

    setLoading(true);
    loadedWorldIdRef.current = worldId;
    loadWorld(worldId).then(() => {
      setLoading(false);
      setReady(true);
    });
  }, [session?.worldId, loadWorld]);

  // If we already have a world loaded in the editor (e.g. from a previous edit),
  // and there's no active session, check if serverWorldId is set
  useEffect(() => {
    if (!session?.worldId && serverWorldId) {
      setReady(true);
    }
  }, [session?.worldId, serverWorldId]);

  // Fetch worlds for the dropdown (only if no active session and nothing loaded)
  useEffect(() => {
    if (!session?.worldId && !serverWorldId) {
      fetchWorlds();
    }
  }, [session?.worldId, serverWorldId, fetchWorlds]);

  // Handle dropdown selection
  const handleSelect = async (worldId: string) => {
    setLoading(true);
    loadedWorldIdRef.current = worldId;
    await loadWorld(worldId);
    setLoading(false);
    setReady(true);
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/40" />
      </div>
    );
  }

  // No active session and nothing loaded — show picker
  if (!ready && !session?.worldId) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="mx-auto max-w-2xl p-8">
          <h1 className="mb-6 text-2xl font-bold text-foreground">World Info</h1>
          <p className="mb-4 text-sm text-muted-foreground/50">
            No active session. Select a world to edit:
          </p>
          <select
            onChange={(e) => e.target.value && handleSelect(e.target.value)}
            defaultValue=""
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
          >
            <option value="">Choose a world...</option>
            {worlds.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name || "Untitled"}
              </option>
            ))}
          </select>
        </div>
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/40" />
        </div>
      }
    >
      <EditorShell />
    </Suspense>
  );
}
