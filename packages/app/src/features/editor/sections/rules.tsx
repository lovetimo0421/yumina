import { useState } from "react";
import { Plus, Trash2, GripVertical, ScrollText } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/stores/editor";
import type { Condition, Effect } from "@yumina/engine";

const OPERATORS: { value: Condition["operator"]; label: string }[] = [
  { value: "eq", label: "=" },
  { value: "neq", label: "!=" },
  { value: "gt", label: ">" },
  { value: "gte", label: ">=" },
  { value: "lt", label: "<" },
  { value: "lte", label: "<=" },
  { value: "contains", label: "contains" },
];

const OPERATIONS: { value: Effect["operation"]; label: string }[] = [
  { value: "set", label: "Set to" },
  { value: "add", label: "Add" },
  { value: "subtract", label: "Subtract" },
  { value: "multiply", label: "Multiply" },
  { value: "toggle", label: "Toggle" },
  { value: "append", label: "Append" },
];

export function RulesSection() {
  const { worldDraft, addRule, updateRule, removeRule } = useEditorStore();
  const [selectedId, setSelectedId] = useState<string | null>(
    worldDraft.rules[0]?.id ?? null
  );

  const selected = worldDraft.rules.find((r) => r.id === selectedId);
  const variables = worldDraft.variables;

  function addCondition() {
    if (!selected || variables.length === 0) return;
    const newCond: Condition = {
      variableId: variables[0]!.id,
      operator: "eq",
      value: 0,
    };
    updateRule(selected.id, {
      conditions: [...selected.conditions, newCond],
    });
  }

  function removeCondition(index: number) {
    if (!selected) return;
    updateRule(selected.id, {
      conditions: selected.conditions.filter((_, i) => i !== index),
    });
  }

  function updateCondition(index: number, updates: Partial<Condition>) {
    if (!selected) return;
    updateRule(selected.id, {
      conditions: selected.conditions.map((c, i) =>
        i === index ? { ...c, ...updates } : c
      ),
    });
  }

  function addEffect() {
    if (!selected || variables.length === 0) return;
    const newEffect: Effect = {
      variableId: variables[0]!.id,
      operation: "set",
      value: 0,
    };
    updateRule(selected.id, {
      effects: [...selected.effects, newEffect],
    });
  }

  function removeEffect(index: number) {
    if (!selected) return;
    updateRule(selected.id, {
      effects: selected.effects.filter((_, i) => i !== index),
    });
  }

  function updateEffect(index: number, updates: Partial<Effect>) {
    if (!selected) return;
    updateRule(selected.id, {
      effects: selected.effects.map((e, i) =>
        i === index ? { ...e, ...updates } : e
      ),
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Rules</h2>
          <p className="mt-1 text-sm text-muted-foreground/50">
            Automate game logic with condition-based rules
          </p>
        </div>
        <button
          onClick={() => {
            addRule();
            const rules = useEditorStore.getState().worldDraft.rules;
            setSelectedId(rules[rules.length - 1]?.id ?? null);
          }}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Rule
        </button>
      </div>

      {variables.length === 0 && worldDraft.rules.length === 0 && (
        <div className="rounded-lg border border-border bg-accent/50 p-3 text-sm text-muted-foreground/60">
          Add variables first before creating rules.
        </div>
      )}

      {worldDraft.rules.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-12 text-center">
          <ScrollText className="mx-auto h-8 w-8 text-muted-foreground/20" />
          <p className="mt-2 text-sm text-muted-foreground/40">
            No rules yet. Rules trigger automatically when conditions are met.
          </p>
        </div>
      ) : (
        <div className="flex gap-4">
          {/* Rule list */}
          <div className="w-48 shrink-0 space-y-1">
            {worldDraft.rules.map((rule) => (
              <button
                key={rule.id}
                onClick={() => setSelectedId(rule.id)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                  selectedId === rule.id
                    ? "active-surface text-foreground"
                    : "text-muted-foreground hover-surface"
                )}
              >
                <GripVertical className="h-3 w-3 shrink-0 opacity-30" />
                <span className="truncate">{rule.name || "Unnamed"}</span>
              </button>
            ))}
          </div>

          {/* Rule form */}
          {selected && (
            <div className="flex-1 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-foreground">Edit Rule</h3>
                <button
                  onClick={() => {
                    removeRule(selected.id);
                    const rules =
                      useEditorStore.getState().worldDraft.rules;
                    setSelectedId(rules[0]?.id ?? null);
                  }}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-3 w-3" />
                  Delete
                </button>
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
                    updateRule(selected.id, { name: e.target.value })
                  }
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {/* Description */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Description
                </label>
                <input
                  type="text"
                  value={selected.description ?? ""}
                  onChange={(e) =>
                    updateRule(selected.id, { description: e.target.value })
                  }
                  placeholder="What this rule does..."
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {/* Condition Logic */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Match
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      updateRule(selected.id, { conditionLogic: "all" })
                    }
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-sm transition-colors",
                      selected.conditionLogic === "all"
                        ? "bg-primary text-primary-foreground"
                        : "bg-accent text-muted-foreground"
                    )}
                  >
                    All (AND)
                  </button>
                  <button
                    onClick={() =>
                      updateRule(selected.id, { conditionLogic: "any" })
                    }
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-sm transition-colors",
                      selected.conditionLogic === "any"
                        ? "bg-primary text-primary-foreground"
                        : "bg-accent text-muted-foreground"
                    )}
                  >
                    Any (OR)
                  </button>
                </div>
              </div>

              {/* Conditions */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-sm font-medium text-foreground">
                    Conditions
                  </label>
                  <button
                    onClick={addCondition}
                    disabled={variables.length === 0}
                    className="text-xs text-primary hover:underline disabled:opacity-40"
                  >
                    + Add Condition
                  </button>
                </div>
                {selected.conditions.length === 0 ? (
                  <p className="text-xs text-muted-foreground/40">
                    No conditions — rule always triggers
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selected.conditions.map((cond, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 rounded-lg border border-border bg-accent/50 p-2"
                      >
                        <select
                          value={cond.variableId}
                          onChange={(e) =>
                            updateCondition(i, { variableId: e.target.value })
                          }
                          className="rounded border border-border bg-background px-2 py-1 text-xs text-foreground"
                        >
                          {variables.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.name}
                            </option>
                          ))}
                        </select>
                        <select
                          value={cond.operator}
                          onChange={(e) =>
                            updateCondition(i, {
                              operator: e.target.value as Condition["operator"],
                            })
                          }
                          className="rounded border border-border bg-background px-2 py-1 text-xs text-foreground"
                        >
                          {OPERATORS.map((op) => (
                            <option key={op.value} value={op.value}>
                              {op.label}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={String(cond.value)}
                          onChange={(e) => {
                            const num = parseFloat(e.target.value);
                            updateCondition(i, {
                              value: isNaN(num) ? e.target.value : num,
                            });
                          }}
                          className="w-20 rounded border border-border bg-background px-2 py-1 text-xs text-foreground"
                        />
                        <button
                          onClick={() => removeCondition(i)}
                          className="text-muted-foreground/40 hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Effects */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-sm font-medium text-foreground">
                    Effects
                  </label>
                  <button
                    onClick={addEffect}
                    disabled={variables.length === 0}
                    className="text-xs text-primary hover:underline disabled:opacity-40"
                  >
                    + Add Effect
                  </button>
                </div>
                {selected.effects.length === 0 ? (
                  <p className="text-xs text-muted-foreground/40">
                    No effects
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selected.effects.map((eff, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 rounded-lg border border-border bg-accent/50 p-2"
                      >
                        <select
                          value={eff.variableId}
                          onChange={(e) =>
                            updateEffect(i, { variableId: e.target.value })
                          }
                          className="rounded border border-border bg-background px-2 py-1 text-xs text-foreground"
                        >
                          {variables.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.name}
                            </option>
                          ))}
                        </select>
                        <select
                          value={eff.operation}
                          onChange={(e) =>
                            updateEffect(i, {
                              operation: e.target.value as Effect["operation"],
                            })
                          }
                          className="rounded border border-border bg-background px-2 py-1 text-xs text-foreground"
                        >
                          {OPERATIONS.map((op) => (
                            <option key={op.value} value={op.value}>
                              {op.label}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={String(eff.value)}
                          onChange={(e) => {
                            const num = parseFloat(e.target.value);
                            updateEffect(i, {
                              value: isNaN(num) ? e.target.value : num,
                            });
                          }}
                          className="w-20 rounded border border-border bg-background px-2 py-1 text-xs text-foreground"
                        />
                        <button
                          onClick={() => removeEffect(i)}
                          className="text-muted-foreground/40 hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Priority */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Priority
                </label>
                <input
                  type="number"
                  value={selected.priority}
                  onChange={(e) =>
                    updateRule(selected.id, {
                      priority: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-24 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <p className="mt-1 text-xs text-muted-foreground/40">
                  Lower number = higher priority
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
