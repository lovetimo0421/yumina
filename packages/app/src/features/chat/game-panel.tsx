import { useState, useEffect, useMemo } from "react";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useChatStore, type StateChange } from "@/stores/chat";
import { useAudioStore } from "@/stores/audio";
import { resolveComponents } from "@yumina/engine";
import type { WorldDefinition, Variable, GameState } from "@yumina/engine";
import { ComponentRenderer } from "./components";
import { AudioControls } from "./audio-controls";
import {
  CustomComponentRenderer,
  type YuminaAPI,
} from "@/features/studio/lib/custom-component-renderer";

interface GamePanelProps {
  layoutMode?: "split" | "game-focus" | "immersive";
}

export function GamePanel({ layoutMode = "split" }: GamePanelProps) {
  const [open, setOpen] = useState(true);
  const { session, gameState, recentStateChanges, clearRecentStateChanges } =
    useChatStore();

  const worldDef = session?.world?.schema as unknown as
    | WorldDefinition
    | undefined;
  const variables = worldDef?.variables ?? [];
  const components = worldDef?.components ?? [];
  const customComponents = worldDef?.customComponents ?? [];
  const audioTracks = useAudioStore((s) => s.tracks);
  const hasAudio = audioTracks.length > 0;

  useEffect(() => {
    if (recentStateChanges.length === 0) return;
    const timer = setTimeout(clearRecentStateChanges, 5000);
    return () => clearTimeout(timer);
  }, [recentStateChanges, clearRecentStateChanges]);

  // Build the YuminaAPI for custom components (live mode)
  const yuminaAPI = useMemo<YuminaAPI>(
    () => ({
      sendMessage: (text: string) => useChatStore.getState().sendMessage(text),
      setVariable: (id: string, value: number | string | boolean) =>
        useChatStore.getState().setVariableDirectly(id, value),
      variables: gameState,
      worldName: worldDef?.name ?? "",
    }),
    [gameState, worldDef?.name]
  );

  const hasCustomComponents = customComponents.filter((cc) => cc.visible).length > 0;

  if (
    variables.length === 0 &&
    components.length === 0 &&
    !hasCustomComponents &&
    !hasAudio
  )
    return null;

  // If components are defined, use the component system
  const hasComponents = components.length > 0;
  const resolvedComponents = hasComponents
    ? resolveComponents(components, {
        worldId: worldDef?.id ?? "",
        variables: gameState,
        turnCount: 0,
        metadata: {},
      } satisfies GameState, variables)
    : [];

  // Immersive: bare full-screen container, no chrome
  if (layoutMode === "immersive") {
    const visibleCustom = customComponents
      .filter((cc) => cc.visible)
      .sort((a, b) => a.order - b.order);

    return (
      <div className="flex h-full w-full flex-col">
        {hasComponents &&
          resolvedComponents.map((rc) => (
            <ComponentRenderer key={rc.id} component={rc} />
          ))}
        {visibleCustom.map((cc) => (
          <div key={cc.id} className={visibleCustom.length === 1 ? "flex-1" : ""}>
            <CustomComponentRenderer
              code={cc.tsxCode}
              variables={gameState}
              worldName={worldDef?.name}
              api={yuminaAPI}
            />
          </div>
        ))}
      </div>
    );
  }

  // Immersive and game-focus don't have a collapsible sidebar
  const isExpanded = layoutMode === "game-focus";

  return (
    <div
      className={cn(
        "flex flex-col bg-background transition-all duration-200",
        isExpanded
          ? "flex-1"
          : cn("shrink-0 border-l border-border", open ? "w-72" : "w-10")
      )}
    >
      {!isExpanded && (
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
      )}

      {(open || isExpanded) && (
        <div className={cn("flex-1 overflow-y-auto", isExpanded ? "p-6" : "p-3")}>
          {hasAudio && (
            <div className="mb-3">
              <AudioControls />
            </div>
          )}

          <h3 className="mb-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/40">
            {hasComponents || hasCustomComponents ? "Game" : "Game State"}
          </h3>

          <div className="space-y-2">
            {hasComponents
              ? resolvedComponents.map((rc) => (
                  <ComponentRenderer key={rc.id} component={rc} />
                ))
              : !hasCustomComponents &&
                variables.map((variable) => (
                  <VariableDisplay
                    key={variable.id}
                    variable={variable}
                    value={gameState[variable.id] ?? variable.defaultValue}
                    recentChange={recentStateChanges.find(
                      (c) => c.variableId === variable.id
                    )}
                  />
                ))}

            {/* Custom components — rendered in both typed-component and legacy modes */}
            {customComponents
              .filter((cc) => cc.visible)
              .sort((a, b) => a.order - b.order)
              .map((cc) => (
                <CustomComponentRenderer
                  key={cc.id}
                  code={cc.tsxCode}
                  variables={gameState}
                  worldName={worldDef?.name}
                  api={yuminaAPI}
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

// ── Legacy variable display (used when no components are defined) ──

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
        ? ` ${diff > 0 ? "+" : ""}${diff} (${change.oldValue}\u2192${change.newValue})`
        : `: ${change.oldValue}\u2192${change.newValue}`}
    </div>
  );
}
