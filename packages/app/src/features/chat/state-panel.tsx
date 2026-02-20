import { useState, useEffect } from "react";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useChatStore, type StateChange } from "@/stores/chat";
import type { WorldDefinition, Variable } from "@yumina/engine";

export function StatePanel() {
  const [open, setOpen] = useState(true);
  const { session, gameState, recentStateChanges, clearRecentStateChanges } =
    useChatStore();

  const worldDef = session?.world?.schema as unknown as
    | WorldDefinition
    | undefined;
  const variables = worldDef?.variables ?? [];

  useEffect(() => {
    if (recentStateChanges.length === 0) return;
    const timer = setTimeout(clearRecentStateChanges, 5000);
    return () => clearTimeout(timer);
  }, [recentStateChanges, clearRecentStateChanges]);

  if (variables.length === 0) return null;

  return (
    <div
      className={cn(
        "flex shrink-0 flex-col border-l border-border bg-background transition-all duration-200",
        open ? "w-60" : "w-10"
      )}
    >
      <div className="flex h-12 items-center justify-center border-b border-border">
        <button
          onClick={() => setOpen(!open)}
          className="hover-surface flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground/40"
        >
          {open ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      {open && (
        <div className="flex-1 overflow-y-auto p-3">
          <h3 className="mb-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/40">
            Game State
          </h3>

          <div className="space-y-2">
            {variables.map((variable) => (
              <VariableDisplay
                key={variable.id}
                variable={variable}
                value={gameState[variable.id] ?? variable.defaultValue}
                recentChange={recentStateChanges.find(
                  (c) => c.variableId === variable.id
                )}
              />
            ))}
          </div>

          {recentStateChanges.length > 0 && (
            <div className="mt-4 space-y-1">
              {recentStateChanges.map((change, i) => (
                <ChangeNotice key={i} change={change} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function VariableDisplay({
  variable,
  value,
  recentChange,
}: {
  variable: Variable;
  value: number | string | boolean;
  recentChange?: StateChange;
}) {
  const isChanged = !!recentChange;

  if (variable.type === "number" && typeof value === "number") {
    const min = variable.min ?? 0;
    const max = variable.max ?? 100;
    const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));

    return (
      <div className={cn("rounded-lg bg-accent p-3", isChanged && "state-changed")}>
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-foreground/80">{variable.name}</span>
          <span className="font-mono text-muted-foreground/60">{value}</span>
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-background">
          <div
            className="h-full rounded-full bg-primary/60 transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    );
  }

  if (variable.type === "boolean") {
    return (
      <div className={cn("flex items-center justify-between rounded-lg bg-accent p-3", isChanged && "state-changed")}>
        <span className="text-xs font-medium text-foreground/80">{variable.name}</span>
        <div className={cn("h-2 w-2 rounded-full", value ? "bg-primary" : "bg-muted-foreground/20")} />
      </div>
    );
  }

  return (
    <div className={cn("rounded-lg bg-accent p-3", isChanged && "state-changed")}>
      <span className="text-xs font-medium text-foreground/80">{variable.name}</span>
      <p className="mt-0.5 truncate text-xs text-muted-foreground/60">{String(value)}</p>
    </div>
  );
}

function ChangeNotice({ change }: { change: StateChange }) {
  const isIncrease =
    typeof change.newValue === "number" &&
    typeof change.oldValue === "number" &&
    change.newValue > change.oldValue;

  const diff =
    typeof change.newValue === "number" && typeof change.oldValue === "number"
      ? change.newValue - change.oldValue
      : null;

  return (
    <div
      className={cn(
        "rounded-md px-2.5 py-1 text-[11px] font-medium",
        isIncrease ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
      )}
    >
      {change.variableId}
      {diff !== null
        ? ` ${diff > 0 ? "+" : ""}${diff} (${change.oldValue}→${change.newValue})`
        : `: ${change.oldValue}→${change.newValue}`}
    </div>
  );
}
