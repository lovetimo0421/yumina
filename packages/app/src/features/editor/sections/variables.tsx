import { useState, useMemo } from "react";
import { Plus, Trash2, Hash, PackagePlus, ScrollText, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/stores/editor";
import { VARIABLE_PRESET_PACKS } from "@/lib/variable-presets";
import { InlineRuleEditor } from "../components/inline-rule-editor";
import type { Variable, Rule, VariableCategory } from "@yumina/engine";

const CATEGORY_OPTIONS: { value: VariableCategory | ""; label: string }[] = [
  { value: "", label: "None" },
  { value: "stat", label: "Stat" },
  { value: "inventory", label: "Inventory" },
  { value: "resource", label: "Resource" },
  { value: "flag", label: "Flag" },
  { value: "relationship", label: "Relationship" },
  { value: "custom", label: "Custom" },
];

const CATEGORY_COLORS: Record<string, string> = {
  stat: "bg-red-500/10 text-red-500",
  inventory: "bg-amber-500/10 text-amber-500",
  resource: "bg-emerald-500/10 text-emerald-500",
  flag: "bg-blue-500/10 text-blue-500",
  relationship: "bg-pink-500/10 text-pink-500",
  custom: "bg-purple-500/10 text-purple-500",
};

/** Check if a rule references a specific variable in its effects or conditions */
function ruleReferencesVariable(rule: Rule, variableId: string): boolean {
  const inEffects = rule.effects.some((e) => e.variableId === variableId);
  const inConditions = rule.conditions.some((c) => c.variableId === variableId);
  const inNotifConditions = (rule.notificationConditions ?? []).some(
    (c) => c.variableId === variableId
  );
  return inEffects || inConditions || inNotifConditions;
}

export function VariablesSection() {
  const {
    worldDraft,
    addVariable,
    updateVariable,
    removeVariable,
    importVariablePack,
    addRule,
    updateRule,
    removeRule,
  } = useEditorStore();
  const [selectedId, setSelectedId] = useState<string | null>(
    worldDraft.variables[0]?.id ?? null
  );
  const [showPackMenu, setShowPackMenu] = useState(false);
  const [showGlobalRules, setShowGlobalRules] = useState(false);

  const selected = worldDraft.variables.find((v) => v.id === selectedId);
  const variables = worldDraft.variables;
  const audioTracks = worldDraft.audioTracks ?? [];

  // Rules associated with the selected variable
  const associatedRules = useMemo(() => {
    if (!selected) return [];
    return worldDraft.rules.filter((r) => ruleReferencesVariable(r, selected.id));
  }, [worldDraft.rules, selected]);

  // Global rules: rules that reference 0 or 2+ variables
  const globalRules = useMemo(() => {
    return worldDraft.rules.filter((rule) => {
      const referencedVarIds = new Set<string>();
      rule.effects.forEach((e) => referencedVarIds.add(e.variableId));
      rule.conditions.forEach((c) => referencedVarIds.add(c.variableId));
      (rule.notificationConditions ?? []).forEach((c) =>
        referencedVarIds.add(c.variableId)
      );
      return referencedVarIds.size === 0 || referencedVarIds.size >= 2;
    });
  }, [worldDraft.rules]);

  function addRuleForVariable() {
    if (!selected) return;
    addRule();
    // Pre-configure with this variable
    const rules = useEditorStore.getState().worldDraft.rules;
    const newRule = rules[rules.length - 1];
    if (newRule) {
      updateRule(newRule.id, {
        name: `${selected.name} Rule`,
        effects: [
          { variableId: selected.id, operation: "set", value: selected.defaultValue },
        ],
      });
    }
  }

  function addGlobalRule() {
    addRule();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Variables & Rules
          </h2>
          <p className="mt-1 text-sm text-muted-foreground/50">
            Define game state and automation rules
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
                      {pack.variables.length} variables,{" "}
                      {pack.components.length} components
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
                {v.category ? (
                  <span
                    className={cn(
                      "shrink-0 rounded px-1 py-0.5 text-[9px] font-medium leading-none",
                      CATEGORY_COLORS[v.category] ?? "bg-muted text-muted-foreground"
                    )}
                  >
                    {v.category.slice(0, 3).toUpperCase()}
                  </span>
                ) : (
                  <span className="shrink-0 text-xs text-primary/60">
                    {v.type === "number"
                      ? "#"
                      : v.type === "boolean"
                        ? "?"
                        : "T"}
                  </span>
                )}
                <span className="truncate">{v.name || "Unnamed"}</span>
              </button>
            ))}
          </div>

          {/* Variable form + rules */}
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

              {/* Name + Category row */}
              <div className="flex gap-4">
                <div className="flex-1">
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
                <div className="w-36">
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Category
                  </label>
                  <select
                    value={selected.category ?? ""}
                    onChange={(e) =>
                      updateVariable(selected.id, {
                        category: (e.target.value || undefined) as
                          | VariableCategory
                          | undefined,
                      })
                    }
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {CATEGORY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
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

              {/* Update Hints */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  AI Update Hints
                </label>
                <textarea
                  value={selected.updateHints ?? ""}
                  onChange={(e) =>
                    updateVariable(selected.id, {
                      updateHints: e.target.value || undefined,
                    })
                  }
                  placeholder="Decreases by 1 per action. Sleep restores 1."
                  rows={2}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
                <p className="mt-1 text-xs text-muted-foreground/40">
                  Injected into the AI prompt to guide variable updates
                </p>
              </div>

              {/* Associated Rules */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                    <ScrollText className="h-3.5 w-3.5" />
                    Rules
                    {associatedRules.length > 0 && (
                      <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                        {associatedRules.length}
                      </span>
                    )}
                  </h4>
                  <button
                    onClick={addRuleForVariable}
                    className="flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <Plus className="h-3 w-3" />
                    Add Rule
                  </button>
                </div>

                {associatedRules.length === 0 ? (
                  <p className="text-xs text-muted-foreground/40">
                    No rules for this variable
                  </p>
                ) : (
                  <div className="space-y-2">
                    {associatedRules.map((rule) => (
                      <InlineRuleEditor
                        key={rule.id}
                        rule={rule}
                        variables={variables}
                        audioTracks={audioTracks}
                        onUpdate={(updates) => updateRule(rule.id, updates)}
                        onDelete={() => removeRule(rule.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Global Rules */}
      {(globalRules.length > 0 || worldDraft.rules.length > 0) && (
        <div className="border-t border-border pt-4">
          <button
            onClick={() => setShowGlobalRules(!showGlobalRules)}
            className="flex w-full items-center justify-between"
          >
            <h3 className="flex items-center gap-1.5 text-sm font-medium text-foreground">
              <ScrollText className="h-3.5 w-3.5" />
              Global Rules
              {globalRules.length > 0 && (
                <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                  {globalRules.length}
                </span>
              )}
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  addGlobalRule();
                  setShowGlobalRules(true);
                }}
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <Plus className="h-3 w-3" />
                Add
              </button>
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 text-muted-foreground/40 transition-transform",
                  showGlobalRules && "rotate-180"
                )}
              />
            </div>
          </button>
          <p className="mt-1 text-xs text-muted-foreground/40">
            Rules that span multiple variables or have no variable references
          </p>

          {showGlobalRules && (
            <div className="mt-3 space-y-2">
              {globalRules.length === 0 ? (
                <p className="text-xs text-muted-foreground/40">
                  No global rules
                </p>
              ) : (
                globalRules.map((rule) => (
                  <InlineRuleEditor
                    key={rule.id}
                    rule={rule}
                    variables={variables}
                    audioTracks={audioTracks}
                    onUpdate={(updates) => updateRule(rule.id, updates)}
                    onDelete={() => removeRule(rule.id)}
                  />
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
