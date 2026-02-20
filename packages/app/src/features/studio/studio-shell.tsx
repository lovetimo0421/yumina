import { useCallback, useRef, useEffect } from "react";
import { useRouter } from "@tanstack/react-router";
import {
  DockviewReact,
  type DockviewReadyEvent,
  type DockviewApi,
  type IDockviewPanelProps,
} from "dockview-react";
import {
  ArrowLeft,
  Save,
  Loader2,
  Play,
  Square,
  MessageSquare,
  BookOpen,
  Variable,
  ScrollText,
  Music,
  Cog,
  Code,
  LayoutGrid,
  Plus,
  Undo2,
  Redo2,
} from "lucide-react";
import { useEditorStore } from "@/stores/editor";
import { useStudioStore } from "@/stores/studio";
import {
  AiChatPanel,
  CanvasPanel,
  LorebookPanel,
  VariablesPanel,
  RulesPanel,
  AudioPanel,
  SettingsPanel,
  CodeViewPanel,
  PlaytestPanel,
} from "./panels";

import "dockview-react/dist/styles/dockview.css";
import "./studio-theme.css";

const PANEL_COMPONENTS: Record<
  string,
  React.FC<IDockviewPanelProps>
> = {
  "ai-chat": AiChatPanel,
  canvas: CanvasPanel,
  lorebook: LorebookPanel,
  variables: VariablesPanel,
  rules: RulesPanel,
  audio: AudioPanel,
  settings: SettingsPanel,
  "code-view": CodeViewPanel,
  playtest: PlaytestPanel,
};

const PANEL_MENU = [
  { id: "lorebook", label: "Lorebook", icon: BookOpen },
  { id: "variables", label: "Variables", icon: Variable },
  { id: "rules", label: "Rules", icon: ScrollText },
  { id: "audio", label: "Audio", icon: Music },
  { id: "settings", label: "Settings", icon: Cog },
  { id: "code-view", label: "Code View", icon: Code },
  { id: "canvas", label: "Canvas", icon: LayoutGrid },
  { id: "ai-chat", label: "AI Chat", icon: MessageSquare },
] as const;

function getLayoutKey(worldId: string) {
  return `yumina-studio-layout-${worldId}`;
}

export function StudioShell() {
  const router = useRouter();
  const { worldDraft, serverWorldId, isDirty, saving, saveDraft, canUndo, canRedo, undo, redo } =
    useEditorStore();
  const { mode, setMode, setPlaytestSessionId } = useStudioStore();
  const dockviewRef = useRef<DockviewApi | null>(null);
  const menuOpen = useRef(false);

  const onReady = useCallback(
    (event: DockviewReadyEvent) => {
      dockviewRef.current = event.api;

      // Try to restore saved layout
      const key = getLayoutKey(serverWorldId ?? "new");
      const saved = localStorage.getItem(key);

      if (saved) {
        try {
          const layout = JSON.parse(saved);
          event.api.fromJSON(layout);
          return;
        } catch {
          // fallback to default layout
        }
      }

      // Default layout: AI Chat left, Canvas center
      const chatPanel = event.api.addPanel({
        id: "ai-chat",
        component: "ai-chat",
        title: "AI Chat",
      });

      event.api.addPanel({
        id: "canvas",
        component: "canvas",
        title: "Canvas",
        position: { referencePanel: chatPanel, direction: "right" },
      });

      // Set initial sizing (chat ~300px, canvas fills rest)
      try {
        const chatGroup = chatPanel.group;
        if (chatGroup) {
          event.api.getGroup(chatGroup.id)?.api.setSize({ width: 340 });
        }
      } catch {
        // sizing may not be available immediately
      }
    },
    [serverWorldId]
  );

  const saveLayout = useCallback(() => {
    if (!dockviewRef.current) return;
    const key = getLayoutKey(serverWorldId ?? "new");
    try {
      const layout = dockviewRef.current.toJSON();
      localStorage.setItem(key, JSON.stringify(layout));
    } catch {
      // ignore
    }
  }, [serverWorldId]);

  const addPanel = useCallback(
    (panelId: string, title: string) => {
      if (!dockviewRef.current) return;

      // Check if already exists
      const existing = dockviewRef.current.getPanel(panelId);
      if (existing) {
        existing.api.setActive();
        return;
      }

      dockviewRef.current.addPanel({
        id: panelId,
        component: panelId,
        title,
      });
    },
    []
  );

  const handleSave = useCallback(async () => {
    saveLayout();
    await saveDraft();
  }, [saveLayout, saveDraft]);

  // Ctrl+Z / Ctrl+Y keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === "z") {
        e.preventDefault();
        useEditorStore.getState().undo();
      }
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === "y" || (e.shiftKey && e.key === "z") || (e.shiftKey && e.key === "Z"))
      ) {
        e.preventDefault();
        useEditorStore.getState().redo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        const state = useEditorStore.getState();
        if (state.isDirty && !state.saving) {
          saveLayout();
          state.saveDraft();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [saveLayout]);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <button
          onClick={() => {
            saveLayout();
            router.navigate({
              to: "/app/worlds/$worldId/edit",
              params: { worldId: serverWorldId ?? "" },
            });
          }}
          className="hover-surface rounded-lg p-1.5 text-muted-foreground"
          title="Back to Editor"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        <span className="text-sm font-medium text-foreground truncate max-w-[200px]">
          {worldDraft.name || "Untitled"}
        </span>

        <div className="mx-2 h-4 w-px bg-border" />

        {/* Panel add menu */}
        <div className="relative">
          <button
            onClick={() => {
              menuOpen.current = !menuOpen.current;
              // Force re-render for menu toggle
              const el = document.getElementById("studio-panel-menu");
              if (el) el.classList.toggle("hidden");
            }}
            className="hover-surface flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground"
            title="Add Panel"
          >
            <Plus className="h-3.5 w-3.5" />
            Panels
          </button>
          <div
            id="studio-panel-menu"
            className="hidden absolute top-full left-0 z-50 mt-1 min-w-[160px] rounded-lg border border-border bg-popover p-1 shadow-xl"
          >
            {PANEL_MENU.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  addPanel(item.id, item.label);
                  document
                    .getElementById("studio-panel-menu")
                    ?.classList.add("hidden");
                }}
                className="hover-surface flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-foreground"
              >
                <item.icon className="h-3.5 w-3.5 text-muted-foreground" />
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Undo / Redo */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={undo}
            disabled={!canUndo}
            className="hover-surface rounded-lg p-1.5 text-muted-foreground disabled:opacity-30"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            className="hover-surface rounded-lg p-1.5 text-muted-foreground disabled:opacity-30"
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex-1" />

        {/* Play/Edit toggle */}
        <button
          onClick={() => {
            if (mode === "edit") {
              setMode("playtest");
              setPlaytestSessionId(null);
              // Open playtest panel
              if (dockviewRef.current) {
                const existing = dockviewRef.current.getPanel("playtest");
                if (existing) {
                  existing.api.setActive();
                } else {
                  dockviewRef.current.addPanel({
                    id: "playtest",
                    component: "playtest",
                    title: "Playtest",
                  });
                }
              }
            } else {
              setMode("edit");
              setPlaytestSessionId(null);
              // Remove playtest panel
              if (dockviewRef.current) {
                const panel = dockviewRef.current.getPanel("playtest");
                if (panel) {
                  dockviewRef.current.removePanel(panel);
                }
              }
            }
          }}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            mode === "playtest"
              ? "bg-destructive/20 text-destructive"
              : "hover-surface text-muted-foreground"
          }`}
        >
          {mode === "playtest" ? (
            <>
              <Square className="h-3 w-3" />
              Stop
            </>
          ) : (
            <>
              <Play className="h-3 w-3" />
              Play
            </>
          )}
        </button>

        {/* Save */}
        {isDirty && (
          <span className="text-xs text-muted-foreground/50">Unsaved</span>
        )}
        <button
          onClick={handleSave}
          disabled={saving || !isDirty}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity disabled:opacity-40"
        >
          {saving ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Save className="h-3 w-3" />
          )}
          Save
        </button>
      </div>

      {/* Dockview fills remaining space */}
      <div className="flex-1 overflow-hidden">
        <DockviewReact
          className="dockview-theme-yumina"
          onReady={onReady}
          components={PANEL_COMPONENTS}
        />
      </div>
    </div>
  );
}
