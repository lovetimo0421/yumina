import { useState } from "react";
import { Plus, Trash2, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/stores/editor";
import {
  COMPONENT_TYPE_META,
  type GameComponent,
  type ComponentType,
} from "@yumina/engine";

const COMPONENT_TYPES = Object.entries(COMPONENT_TYPE_META) as [
  ComponentType,
  (typeof COMPONENT_TYPE_META)[ComponentType],
][];

export function ComponentsSection() {
  const {
    worldDraft,
    addComponent,
    updateComponent,
    removeComponent,
  } = useEditorStore();
  const [selectedId, setSelectedId] = useState<string | null>(
    worldDraft.components[0]?.id ?? null
  );

  const selected = worldDraft.components.find((c) => c.id === selectedId);

  // Variables compatible with the selected component type
  const compatibleVars = selected
    ? worldDraft.variables.filter((v) =>
        COMPONENT_TYPE_META[selected.type].compatibleVariableTypes.includes(v.type)
      )
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Components</h2>
          <p className="mt-1 text-sm text-muted-foreground/50">
            Visual UI elements bound to game variables (stat bars, text, images)
          </p>
        </div>
        <button
          onClick={() => {
            addComponent();
            const comps = useEditorStore.getState().worldDraft.components;
            setSelectedId(comps[comps.length - 1]?.id ?? null);
          }}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Component
        </button>
      </div>

      {worldDraft.components.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-12 text-center">
          <LayoutGrid className="mx-auto h-8 w-8 text-muted-foreground/20" />
          <p className="mt-2 text-sm text-muted-foreground/40">
            No components yet. Add one to create game UI.
          </p>
          <p className="mt-1 text-xs text-muted-foreground/30">
            Components show as visual elements (stat bars, images, etc.) in the
            game panel during play.
          </p>
        </div>
      ) : (
        <div className="flex gap-4">
          {/* Component list */}
          <div className="w-48 shrink-0 space-y-1">
            {worldDraft.components.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                  selectedId === c.id
                    ? "active-surface text-foreground"
                    : "text-muted-foreground hover-surface"
                )}
              >
                <span className="shrink-0 text-[10px] uppercase text-primary/50">
                  {c.type.split("-")[0]}
                </span>
                <span className="truncate">{c.name || "Unnamed"}</span>
              </button>
            ))}
          </div>

          {/* Component form */}
          {selected && (
            <div className="flex-1 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-foreground">
                  Edit Component
                </h3>
                <button
                  onClick={() => {
                    removeComponent(selected.id);
                    const comps =
                      useEditorStore.getState().worldDraft.components;
                    setSelectedId(comps[0]?.id ?? null);
                  }}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-3 w-3" />
                  Delete
                </button>
              </div>

              {/* Type */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Type
                </label>
                <select
                  value={selected.type}
                  onChange={(e) => {
                    const type = e.target.value as ComponentType;
                    updateComponent(selected.id, {
                      type,
                      config: { variableId: "" },
                    } as Partial<GameComponent>);
                  }}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {COMPONENT_TYPES.map(([type, meta]) => (
                    <option key={type} value={type}>
                      {meta.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-muted-foreground/40">
                  {COMPONENT_TYPE_META[selected.type].description}
                </p>
              </div>

              {/* Name */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Name
                </label>
                <input
                  type="text"
                  value={selected.name}
                  onChange={(e) =>
                    updateComponent(selected.id, { name: e.target.value })
                  }
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {/* Variable binding */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Bound Variable
                </label>
                {compatibleVars.length === 0 ? (
                  <p className="text-xs text-muted-foreground/40 italic">
                    No compatible variables found. This component needs a{" "}
                    {COMPONENT_TYPE_META[selected.type].compatibleVariableTypes.join(
                      " or "
                    )}{" "}
                    variable.
                  </p>
                ) : (
                  <select
                    value={selected.config.variableId}
                    onChange={(e) =>
                      updateComponent(selected.id, {
                        config: {
                          ...selected.config,
                          variableId: e.target.value,
                        },
                      } as Partial<GameComponent>)
                    }
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Select a variable...</option>
                    {compatibleVars.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} ({v.id})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Type-specific config */}
              <TypeSpecificConfig
                component={selected}
                onUpdate={(config) =>
                  updateComponent(selected.id, {
                    config: { ...selected.config, ...config },
                  } as Partial<GameComponent>)
                }
              />

              {/* Order */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Display Order
                </label>
                <input
                  type="number"
                  value={selected.order}
                  onChange={(e) =>
                    updateComponent(selected.id, {
                      order: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-32 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <p className="mt-1 text-xs text-muted-foreground/40">
                  Lower numbers appear first in the game panel
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TypeSpecificConfig({
  component,
  onUpdate,
}: {
  component: GameComponent;
  onUpdate: (config: Record<string, unknown>) => void;
}) {
  switch (component.type) {
    case "stat-bar":
      return (
        <div className="space-y-3 rounded-lg border border-border/50 bg-accent/50 p-3">
          <p className="text-xs font-medium text-muted-foreground/50">
            Stat Bar Options
          </p>
          <div className="flex gap-3">
            <label className="flex items-center gap-2 text-xs text-foreground/80">
              <input
                type="checkbox"
                checked={component.config.showValue ?? true}
                onChange={(e) => onUpdate({ showValue: e.target.checked })}
                className="rounded"
              />
              Show Value
            </label>
            <label className="flex items-center gap-2 text-xs text-foreground/80">
              <input
                type="checkbox"
                checked={component.config.showLabel ?? true}
                onChange={(e) => onUpdate({ showLabel: e.target.checked })}
                className="rounded"
              />
              Show Label
            </label>
          </div>
          <div>
            <label className="mb-1 block text-xs text-foreground/80">
              Bar Color
            </label>
            <input
              type="text"
              value={component.config.color ?? ""}
              onChange={(e) => onUpdate({ color: e.target.value || undefined })}
              placeholder="hsl(142, 71%, 45%) or #22c55e"
              className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>
      );

    case "text-display":
      return (
        <div className="space-y-3 rounded-lg border border-border/50 bg-accent/50 p-3">
          <p className="text-xs font-medium text-muted-foreground/50">
            Text Display Options
          </p>
          <div>
            <label className="mb-1 block text-xs text-foreground/80">
              Format Template
            </label>
            <input
              type="text"
              value={component.config.format ?? ""}
              onChange={(e) =>
                onUpdate({ format: e.target.value || undefined })
              }
              placeholder='e.g. "Location: {{value}}"'
              className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-foreground/80">
              Font Size
            </label>
            <select
              value={component.config.fontSize ?? "md"}
              onChange={(e) => onUpdate({ fontSize: e.target.value })}
              className="rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="sm">Small</option>
              <option value="md">Medium</option>
              <option value="lg">Large</option>
            </select>
          </div>
        </div>
      );

    case "choice-list":
      return (
        <div className="space-y-3 rounded-lg border border-border/50 bg-accent/50 p-3">
          <p className="text-xs font-medium text-muted-foreground/50">
            Choice List Options
          </p>
          <div>
            <label className="mb-1 block text-xs text-foreground/80">
              Max Choices
            </label>
            <input
              type="number"
              min={2}
              max={8}
              value={component.config.maxChoices ?? 4}
              onChange={(e) =>
                onUpdate({ maxChoices: parseInt(e.target.value) || 4 })
              }
              className="w-24 rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-foreground/80">
              Style
            </label>
            <select
              value={component.config.style ?? "buttons"}
              onChange={(e) => onUpdate({ style: e.target.value })}
              className="rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="buttons">Buttons</option>
              <option value="list">List</option>
            </select>
          </div>
        </div>
      );

    case "image-panel":
      return (
        <div className="space-y-3 rounded-lg border border-border/50 bg-accent/50 p-3">
          <p className="text-xs font-medium text-muted-foreground/50">
            Image Panel Options
          </p>
          <div>
            <label className="mb-1 block text-xs text-foreground/80">
              Aspect Ratio
            </label>
            <select
              value={component.config.aspectRatio ?? "landscape"}
              onChange={(e) => onUpdate({ aspectRatio: e.target.value })}
              className="rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="square">Square (1:1)</option>
              <option value="portrait">Portrait (3:4)</option>
              <option value="landscape">Landscape (16:9)</option>
              <option value="wide">Wide (21:9)</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-foreground/80">
              Fallback URL
            </label>
            <input
              type="text"
              value={component.config.fallbackUrl ?? ""}
              onChange={(e) =>
                onUpdate({ fallbackUrl: e.target.value || undefined })
              }
              placeholder="https://..."
              className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>
      );

    case "inventory-grid":
      return (
        <div className="space-y-3 rounded-lg border border-border/50 bg-accent/50 p-3">
          <p className="text-xs font-medium text-muted-foreground/50">
            Inventory Grid Options
          </p>
          <div className="flex gap-3">
            <div>
              <label className="mb-1 block text-xs text-foreground/80">
                Columns
              </label>
              <input
                type="number"
                min={2}
                max={8}
                value={component.config.columns ?? 4}
                onChange={(e) =>
                  onUpdate({ columns: parseInt(e.target.value) || 4 })
                }
                className="w-20 rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-foreground/80">
                Max Slots
              </label>
              <input
                type="number"
                min={4}
                max={64}
                value={component.config.maxSlots ?? 16}
                onChange={(e) =>
                  onUpdate({ maxSlots: parseInt(e.target.value) || 16 })
                }
                className="w-20 rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>
        </div>
      );

    case "toggle-switch":
      return (
        <div className="space-y-3 rounded-lg border border-border/50 bg-accent/50 p-3">
          <p className="text-xs font-medium text-muted-foreground/50">
            Toggle Switch Options
          </p>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-xs text-foreground/80">
                On Label
              </label>
              <input
                type="text"
                value={component.config.onLabel ?? ""}
                onChange={(e) =>
                  onUpdate({ onLabel: e.target.value || undefined })
                }
                placeholder="On"
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs text-foreground/80">
                Off Label
              </label>
              <input
                type="text"
                value={component.config.offLabel ?? ""}
                onChange={(e) =>
                  onUpdate({ offLabel: e.target.value || undefined })
                }
                placeholder="Off"
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>
        </div>
      );
  }
}
