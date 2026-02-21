import { useState } from "react";
import { Plus, Trash2, Hash, PackagePlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/stores/editor";
import { VARIABLE_PRESET_PACKS } from "@/lib/variable-presets";
import type { Variable } from "@yumina/engine";

export function VariablesSection() {
  const { worldDraft, addVariable, updateVariable, removeVariable, importVariablePack } =
    useEditorStore();
  const [selectedId, setSelectedId] = useState<string | null>(
    worldDraft.variables[0]?.id ?? null
  );
  const [showPackMenu, setShowPackMenu] = useState(false);

  const selected = worldDraft.variables.find((v) => v.id === selectedId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Variables</h2>
          <p className="mt-1 text-sm text-muted-foreground/50">
            Track game state with variables (health, gold, flags, etc.)
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Import Pack */}
          <div className="relative">
            <button
              onClick={() => setShowPackMenu(!showPackMenu)}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              <PackagePlus className="h-3.5 w-3.5" />
              Import Pack
            </button>
            {showPackMenu && (
              <div className="absolute right-0 top-full z-10 mt-1 w-72 rounded-lg border border-border bg-popover p-1 shadow-lg">
                {VARIABLE_PRESET_PACKS.map((pack) => (
                  <button
                    key={pack.id}
                    onClick={() => {
                      importVariablePack(pack);
                      setShowPackMenu(false);
                    }}
                    className="flex w-full flex-col gap-0.5 rounded-md px-3 py-2 text-left transition-colors hover:bg-accent"
                  >
                    <span className="text-sm font-medium text-foreground">
                      {pack.name}
                    </span>
                    <span className="text-xs text-muted-foreground/60">
                      {pack.description}
                    </span>
                    <span className="text-[10px] text-muted-foreground/40">
                      {pack.variables.length} variables, {pack.components.length} components
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Add Variable */}
          <button
            onClick={() => {
              addVariable();
              const vars = useEditorStore.getState().worldDraft.variables;
              setSelectedId(vars[vars.length - 1]?.id ?? null);
            }}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Variable
          </button>
        </div>
      </div>

      {worldDraft.variables.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-12 text-center">
          <Hash className="mx-auto h-8 w-8 text-muted-foreground/20" />
          <p className="mt-2 text-sm text-muted-foreground/40">
            No variables yet. Add one to track game state.
          </p>
        </div>
      ) : (
        <div className="flex gap-4">
          {/* Variable list */}
          <div className="w-48 shrink-0 space-y-1">
            {worldDraft.variables.map((v) => (
              <button
                key={v.id}
                onClick={() => setSelectedId(v.id)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                  selectedId === v.id
                    ? "active-surface text-foreground"
                    : "text-muted-foreground hover-surface"
                )}
              >
                <span className="shrink-0 text-xs text-primary/60">
                  {v.type === "number"
                    ? "#"
                    : v.type === "boolean"
                      ? "?"
                      : "T"}
                </span>
                <span className="truncate">{v.name || "Unnamed"}</span>
              </button>
            ))}
          </div>

          {/* Variable form */}
          {selected && (
            <div className="flex-1 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-foreground">Edit Variable</h3>
                <button
                  onClick={() => {
                    removeVariable(selected.id);
                    const vars =
                      useEditorStore.getState().worldDraft.variables;
                    setSelectedId(vars[0]?.id ?? null);
                  }}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-3 w-3" />
                  Delete
                </button>
              </div>

              {/* ID */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  ID
                </label>
                <input
                  type="text"
                  value={selected.id}
                  onChange={(e) =>
                    updateVariable(selected.id, {
                      id: e.target.value.replace(/\s+/g, "_").toLowerCase(),
                    })
                  }
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <p className="mt-1 text-xs text-muted-foreground/40">
                  Used in templates as{" "}
                  <code className="text-primary">{`{{${selected.id}}}`}</code>
                </p>
              </div>

              {/* Name */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Display Name
                </label>
                <input
                  type="text"
                  value={selected.name}
                  onChange={(e) =>
                    updateVariable(selected.id, { name: e.target.value })
                  }
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {/* Type */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Type
                </label>
                <select
                  value={selected.type}
                  onChange={(e) => {
                    const type = e.target.value as Variable["type"];
                    const defaultValue =
                      type === "number" ? 0 : type === "boolean" ? false : "";
                    updateVariable(selected.id, { type, defaultValue });
                  }}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="number">Number</option>
                  <option value="string">String</option>
                  <option value="boolean">Boolean</option>
                </select>
              </div>

              {/* Default value */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Default Value
                </label>
                {selected.type === "boolean" ? (
                  <button
                    onClick={() =>
                      updateVariable(selected.id, {
                        defaultValue: !selected.defaultValue,
                      })
                    }
                    className={cn(
                      "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                      selected.defaultValue
                        ? "bg-primary text-primary-foreground"
                        : "bg-accent text-muted-foreground"
                    )}
                  >
                    {selected.defaultValue ? "True" : "False"}
                  </button>
                ) : selected.type === "number" ? (
                  <input
                    type="number"
                    value={selected.defaultValue as number}
                    onChange={(e) =>
                      updateVariable(selected.id, {
                        defaultValue: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                ) : (
                  <input
                    type="text"
                    value={selected.defaultValue as string}
                    onChange={(e) =>
                      updateVariable(selected.id, {
                        defaultValue: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                )}
              </div>

              {/* Number-specific: min/max */}
              {selected.type === "number" && (
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="mb-1.5 block text-sm font-medium text-foreground">
                      Min
                    </label>
                    <input
                      type="number"
                      value={selected.min ?? ""}
                      onChange={(e) =>
                        updateVariable(selected.id, {
                          min:
                            e.target.value === ""
                              ? undefined
                              : parseFloat(e.target.value),
                        })
                      }
                      placeholder="No min"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="mb-1.5 block text-sm font-medium text-foreground">
                      Max
                    </label>
                    <input
                      type="number"
                      value={selected.max ?? ""}
                      onChange={(e) =>
                        updateVariable(selected.id, {
                          max:
                            e.target.value === ""
                              ? undefined
                              : parseFloat(e.target.value),
                        })
                      }
                      placeholder="No max"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>
              )}

              {/* Description */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Description
                </label>
                <input
                  type="text"
                  value={selected.description ?? ""}
                  onChange={(e) =>
                    updateVariable(selected.id, {
                      description: e.target.value,
                    })
                  }
                  placeholder="What this variable tracks..."
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {/* Preview */}
              <div className="rounded-lg border border-border bg-accent p-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground/60">
                  State Panel Preview
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground">
                    {selected.name}
                  </span>
                  <span className="text-sm font-mono text-primary">
                    {String(selected.defaultValue)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
