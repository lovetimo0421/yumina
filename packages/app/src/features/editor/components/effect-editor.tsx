import { Trash2 } from "lucide-react";
import type { Effect, Variable } from "@yumina/engine";

const OPERATIONS: { value: Effect["operation"]; label: string }[] = [
  { value: "set", label: "Set to" },
  { value: "add", label: "Add" },
  { value: "subtract", label: "Subtract" },
  { value: "multiply", label: "Multiply" },
  { value: "toggle", label: "Toggle" },
  { value: "append", label: "Append" },
];

interface EffectEditorProps {
  effects: Effect[];
  variables: Variable[];
  onChange: (effects: Effect[]) => void;
}

export function EffectEditor({
  effects,
  variables,
  onChange,
}: EffectEditorProps) {
  function addEffect() {
    if (variables.length === 0) return;
    onChange([
      ...effects,
      { variableId: variables[0]!.id, operation: "set", value: 0 },
    ]);
  }

  function updateEffect(index: number, updates: Partial<Effect>) {
    onChange(
      effects.map((e, i) => (i === index ? { ...e, ...updates } : e))
    );
  }

  function removeEffect(index: number) {
    onChange(effects.filter((_, i) => i !== index));
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">Effects</label>
        <button
          onClick={addEffect}
          disabled={variables.length === 0}
          className="text-xs text-primary hover:underline disabled:opacity-40"
        >
          + Add
        </button>
      </div>
      {effects.length === 0 ? (
        <p className="text-xs text-muted-foreground/40">No effects</p>
      ) : (
        <div className="space-y-2">
          {effects.map((eff, i) => (
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
  );
}
