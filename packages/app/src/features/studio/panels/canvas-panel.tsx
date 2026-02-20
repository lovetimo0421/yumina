import type { IDockviewPanelProps } from "dockview-react";
import { resolveComponents } from "@yumina/engine";
import type { GameState } from "@yumina/engine";
import { useEditorStore } from "@/stores/editor";
import { useStudioStore } from "@/stores/studio";
import { ComponentRenderer } from "@/features/chat/components";
import { CustomComponentRenderer } from "../lib/custom-component-renderer";
import { Bot, Trash2 } from "lucide-react";

export function CanvasPanel(_props: IDockviewPanelProps) {
  const { worldDraft } = useEditorStore();
  const { selectedElementId, setSelectedElement } = useStudioStore();

  // Build a preview state from defaults
  const previewState: GameState = {
    worldId: worldDraft.id,
    variables: Object.fromEntries(
      worldDraft.variables.map((v) => [v.id, v.defaultValue])
    ),
    activeCharacterId: worldDraft.characters[0]?.id ?? null,
    turnCount: 0,
    metadata: {},
  };

  // Resolve typed components
  const resolved = resolveComponents(
    worldDraft.components,
    previewState,
    worldDraft.variables
  );

  const hasComponents = resolved.length > 0 || worldDraft.customComponents.length > 0;

  return (
    <div className="h-full overflow-y-auto bg-background p-4">
      {!hasComponents && (
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground/50 gap-2">
          <Bot className="h-8 w-8" />
          <p className="text-xs text-center">
            No components yet.
            <br />
            Ask the AI: "Create a health bar component"
          </p>
        </div>
      )}

      <div className="space-y-3 max-w-lg mx-auto">
        {/* Typed components */}
        {resolved.map((comp) => (
          <SelectableWrapper
            key={comp.id}
            id={comp.id}
            type="component"
            isSelected={selectedElementId === comp.id}
            onSelect={() =>
              setSelectedElement(
                selectedElementId === comp.id ? null : comp.id,
                "component"
              )
            }
          >
            <ComponentRenderer component={comp} />
          </SelectableWrapper>
        ))}

        {/* Custom components */}
        {worldDraft.customComponents
          .filter((cc) => cc.visible)
          .sort((a, b) => a.order - b.order)
          .map((cc) => (
            <SelectableWrapper
              key={cc.id}
              id={cc.id}
              type="customComponent"
              isSelected={selectedElementId === cc.id}
              onSelect={() =>
                setSelectedElement(
                  selectedElementId === cc.id ? null : cc.id,
                  "customComponent"
                )
              }
            >
              <CustomComponentRenderer
                code={cc.tsxCode}
                variables={previewState.variables}
                worldName={worldDraft.name}
              />
            </SelectableWrapper>
          ))}
      </div>
    </div>
  );
}

function SelectableWrapper({
  id,
  type,
  isSelected,
  onSelect,
  children,
}: {
  id: string;
  type: string;
  isSelected: boolean;
  onSelect: () => void;
  children: React.ReactNode;
}) {
  const { removeComponent, removeCustomComponent } = useEditorStore();

  return (
    <div
      onClick={onSelect}
      className={`relative cursor-pointer rounded-lg border p-2 transition-colors ${
        isSelected
          ? "border-primary/60 bg-primary/5"
          : "border-transparent hover:border-border"
      }`}
    >
      {children}

      {isSelected && (
        <div className="absolute -top-2 right-2 flex items-center gap-1">
          <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[10px] font-medium text-primary">
            {id}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (type === "component") removeComponent(id);
              else if (type === "customComponent") removeCustomComponent(id);
            }}
            className="rounded bg-destructive/20 p-0.5 text-destructive hover:bg-destructive/30"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}
