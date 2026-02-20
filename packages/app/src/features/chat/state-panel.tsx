import { useState, useEffect } from "react";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
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

  // Clear notifications after 5 seconds
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
        open ? "w-64" : "w-10"
      )}
    >
      {/* Toggle */}
      <div className="flex h-12 items-center justify-center border-b border-border">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setOpen(!open)}
        >
          {open ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {open && (
        <div className="flex-1 overflow-y-auto p-3">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Game State
          </h3>

          <div className="space-y-3">
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

          {/* State change notifications */}
          {recentStateChanges.length > 0 && (
            <div className="mt-4 space-y-1">
              <h4 className="text-xs font-semibold text-muted-foreground">
                Recent Changes
              </h4>
              {recentStateChanges.map((change, i) => (
                <StateChangeNotification key={i} change={change} />
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
      <div
        className={cn(
          "rounded-md p-2 transition-colors",
          isChanged && "ring-1 ring-primary/50"
        )}
      >
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium">{variable.name}</span>
          <span className="text-muted-foreground">{value}</span>
        </div>
        <div className="mt-1.5 h-1.5 rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              pct > 60
                ? "bg-green-500"
                : pct > 30
                  ? "bg-yellow-500"
                  : "bg-red-500"
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    );
  }

  if (variable.type === "boolean") {
    return (
      <div
        className={cn(
          "flex items-center justify-between rounded-md p-2 transition-colors",
          isChanged && "ring-1 ring-primary/50"
        )}
      >
        <span className="text-xs font-medium">{variable.name}</span>
        <span
          className={cn(
            "h-3 w-3 rounded-full",
            value ? "bg-green-500" : "bg-muted"
          )}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-md p-2 transition-colors",
        isChanged && "ring-1 ring-primary/50"
      )}
    >
      <span className="text-xs font-medium">{variable.name}</span>
      <p className="mt-0.5 truncate text-xs text-muted-foreground">
        {String(value)}
      </p>
    </div>
  );
}

function StateChangeNotification({ change }: { change: StateChange }) {
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
        "rounded px-2 py-1 text-xs",
        isIncrease
          ? "bg-green-500/10 text-green-400"
          : "bg-red-500/10 text-red-400"
      )}
    >
      {change.variableId}
      {diff !== null && (
        <>
          {" "}
          {diff > 0 ? "+" : ""}
          {diff} ({String(change.oldValue)} → {String(change.newValue)})
        </>
      )}
      {diff === null && (
        <>
          : {String(change.oldValue)} → {String(change.newValue)}
        </>
      )}
    </div>
  );
}
