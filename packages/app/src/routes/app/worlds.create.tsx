import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useState } from "react";
import { MessageSquare, Globe, Sword, FileText, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/stores/editor";
import { WORLD_TEMPLATES, type WorldTemplate } from "@/lib/world-templates";

const EditorShell = lazy(() =>
  import("@/features/editor/editor-shell").then((m) => ({
    default: m.EditorShell,
  }))
);

const ARCHETYPE_ICONS: Record<string, typeof MessageSquare> = {
  chat: MessageSquare,
  world: Globe,
  adventure: Sword,
};

function TemplatePicker({ onSelect }: { onSelect: (template: WorldTemplate | null) => void }) {
  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">Create New World</h1>
          <p className="mt-2 text-sm text-muted-foreground/60">
            Start from a template or build from scratch
          </p>
        </div>

        <div className="grid gap-3">
          {/* Blank */}
          <button
            onClick={() => onSelect(null)}
            className={cn(
              "flex items-start gap-4 rounded-xl border border-border p-4 text-left transition-colors",
              "hover:border-primary/30 hover:bg-accent"
            )}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent">
              <FileText className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-medium text-foreground">Blank</div>
              <p className="mt-0.5 text-sm text-muted-foreground/60">
                Empty world with just a main prompt. Full creative control.
              </p>
            </div>
          </button>

          {/* Templates */}
          {WORLD_TEMPLATES.map((tpl) => {
            const Icon = ARCHETYPE_ICONS[tpl.archetype] ?? FileText;
            return (
              <button
                key={tpl.id}
                onClick={() => onSelect(tpl)}
                className={cn(
                  "flex items-start gap-4 rounded-xl border border-border p-4 text-left transition-colors",
                  "hover:border-primary/30 hover:bg-accent"
                )}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-foreground">{tpl.name}</div>
                  <p className="mt-0.5 text-sm text-muted-foreground/60">
                    {tpl.description}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground/40">
                    {tpl.summary.entries} entries, {tpl.summary.variables} variables, {tpl.summary.components} components
                    {tpl.summary.rules > 0 && `, ${tpl.summary.rules} rule${tpl.summary.rules > 1 ? "s" : ""}`}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function WorldCreatePage() {
  const { createNew, loadTemplate } = useEditorStore();
  const [picked, setPicked] = useState(false);

  const handleSelect = (template: WorldTemplate | null) => {
    if (template) {
      loadTemplate(template);
    } else {
      createNew();
    }
    setPicked(true);
  };

  if (!picked) {
    return <TemplatePicker onSelect={handleSelect} />;
  }

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <EditorShell />
    </Suspense>
  );
}

export const Route = createFileRoute("/app/worlds/create")({
  component: WorldCreatePage,
});

function LoadingSpinner() {
  return (
    <div className="flex h-full items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/40" />
    </div>
  );
}
