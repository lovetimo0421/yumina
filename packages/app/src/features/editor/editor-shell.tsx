import { useEffect } from "react";
import { useRouter } from "@tanstack/react-router";
import {
  ArrowLeft,
  Save,
  Loader2,
  BookOpen,
  Users,
  Variable,
  LayoutGrid,
  Music,
  Cog,
  ScrollText,
  Play,
  Wand2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEditorStore, type EditorSection } from "@/stores/editor";
import { OverviewSection } from "./sections/overview";
import { CharactersSection } from "./sections/characters";
import { VariablesSection } from "./sections/variables";
import { ComponentsSection } from "./sections/components";
import { AudioSection } from "./sections/audio";
import { RulesSection } from "./sections/rules";
import { SettingsSection } from "./sections/settings";
import { PreviewSection } from "./sections/preview";

const SECTIONS: { id: EditorSection; label: string; icon: typeof BookOpen }[] =
  [
    { id: "overview", label: "Overview", icon: BookOpen },
    { id: "characters", label: "Characters", icon: Users },
    { id: "variables", label: "Variables", icon: Variable },
    { id: "components", label: "Components", icon: LayoutGrid },
    { id: "audio", label: "Audio", icon: Music },
    { id: "rules", label: "Rules", icon: ScrollText },
    { id: "settings", label: "Settings", icon: Cog },
    { id: "preview", label: "Preview", icon: Play },
  ];

const SECTION_COMPONENTS: Record<EditorSection, React.FC> = {
  overview: OverviewSection,
  characters: CharactersSection,
  variables: VariablesSection,
  components: ComponentsSection,
  audio: AudioSection,
  rules: RulesSection,
  settings: SettingsSection,
  preview: PreviewSection,
};

export function EditorShell() {
  const router = useRouter();
  const {
    worldDraft,
    serverWorldId,
    isDirty,
    saving,
    activeSection,
    setActiveSection,
    setField,
    saveDraft,
  } = useEditorStore();

  const ActiveComponent = SECTION_COMPONENTS[activeSection];

  // Warn on unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <button
          onClick={() => router.navigate({ to: "/app/worlds" })}
          className="hover-surface rounded-lg p-1.5 text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>

        <input
          type="text"
          value={worldDraft.name}
          onChange={(e) => setField("name", e.target.value)}
          placeholder="World name..."
          className="flex-1 bg-transparent text-lg font-semibold text-foreground placeholder:text-muted-foreground/30 focus:outline-none"
        />

        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              let id = serverWorldId;
              if (!id) {
                // Auto-save first for unsaved worlds
                await saveDraft();
                id = useEditorStore.getState().serverWorldId;
              }
              if (id) {
                router.navigate({
                  to: "/app/studio/$worldId",
                  params: { worldId: id },
                });
              }
            }}
            disabled={saving || (!serverWorldId && !worldDraft.name)}
            className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/20 disabled:opacity-40"
          >
            <Wand2 className="h-3.5 w-3.5" />
            Enter Studio
          </button>
          {isDirty && (
            <span className="text-xs text-muted-foreground/50">
              Unsaved changes
            </span>
          )}
          <button
            onClick={saveDraft}
            disabled={saving || !isDirty}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity disabled:opacity-40"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Save
          </button>
        </div>
      </div>

      {/* Body: sidebar + content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar — section nav */}
        <nav className="flex w-48 shrink-0 flex-col gap-0.5 border-r border-border p-2">
          {SECTIONS.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                activeSection === section.id
                  ? "active-surface text-foreground"
                  : "text-muted-foreground hover-surface"
              )}
            >
              <section.icon className="h-4 w-4" />
              {section.label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-3xl">
            <ActiveComponent />
          </div>
        </div>
      </div>
    </div>
  );
}
