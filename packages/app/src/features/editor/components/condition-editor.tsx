import { Trash2 } from "lucide-react";
import type { Condition, Variable } from "@yumina/engine";

const OPERATORS: { value: Condition["operator"]; label: string }[] = [
  { value: "eq", label: "=" },
  { value: "neq", label: "!=" },
  { value: "gt", label: ">" },
  { value: "gte", label: ">=" },
  { value: "lt", label: "<" },
  { value: "lte", label: "<=" },
  { value: "contains", label: "contains" },
];

interface ConditionEditorProps {
  conditions: Condition[];
  variables: Variable[];
  onChange: (conditions: Condition[]) => void;
  label?: string;
}

export function ConditionEditor({
  conditions,
  variables,
  onChange,
  label = "Conditions",
}: ConditionEditorProps) {
  function addCondition() {
    if (variables.length === 0) return;
    onChange([
      ...conditions,
      { variableId: variables[0]!.id, operator: "eq", value: 0 },
    ]);
  }

  function updateCondition(index: number, updates: Partial<Condition>) {
    onChange(
      conditions.map((c, i) => (i === index ? { ...c, ...updates } : c))
    );
  }

  function removeCondition(index: number) {
    onChange(conditions.filter((_, i) => i !== index));
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">{label}</label>
        <button
          onClick={addCondition}
          disabled={variables.length === 0}
          className="text-xs text-primary hover:underline disabled:opacity-40"
        >
          + Add
        </button>
      </div>
      {conditions.length === 0 ? (
        <p className="text-xs text-muted-foreground/40">
          No conditions — rule always triggers
        </p>
      ) : (
        <div className="space-y-2">
          {conditions.map((cond, i) => (
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
  );
}
