import { Trash2, ChevronDown } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Rule, Variable, AudioTrack, AudioEffect } from "@yumina/engine";
import { ConditionEditor } from "./condition-editor";
import { EffectEditor } from "./effect-editor";

interface InlineRuleEditorProps {
  rule: Rule;
  variables: Variable[];
  audioTracks?: AudioTrack[];
  onUpdate: (updates: Partial<Rule>) => void;
  onDelete: () => void;
}

export function InlineRuleEditor({
  rule,
  variables,
  audioTracks = [],
  onUpdate,
  onDelete,
}: InlineRuleEditorProps) {
  const [expanded, setExpanded] = useState(false);

  const triggerType = rule.trigger ?? "condition";
  const notificationMode = rule.notification ?? "silent";

  // Summary text for collapsed state
  const condCount = rule.conditions.length;
  const effCount = rule.effects.length;
  const summary = `${condCount} condition${condCount !== 1 ? "s" : ""}, ${effCount} effect${effCount !== 1 ? "s" : ""}`;

  return (
    <div className="rounded-lg border border-border bg-background">
      {/* Collapsed header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
      >
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-muted-foreground/40 transition-transform",
            expanded && "rotate-180"
          )}
        />
        <span className="flex-1 truncate text-sm font-medium text-foreground">
          {rule.name || "Unnamed Rule"}
        </span>
        <span
          className={cn(
            "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium",
            triggerType === "action"
              ? "bg-blue-500/10 text-blue-500"
              : "bg-primary/10 text-primary"
          )}
        >
          {triggerType === "action" ? "Action" : "Condition"}
        </span>
        <span className="shrink-0 text-xs text-muted-foreground/40">
          {summary}
        </span>
      </button>

      {/* Expanded form */}
      {expanded && (
        <div className="space-y-4 border-t border-border px-3 py-3">
          {/* Name + delete */}
          <div className="flex items-center justify-between gap-2">
            <input
              type="text"
              value={rule.name}
              onChange={(e) => onUpdate({ name: e.target.value })}
              placeholder="Rule name..."
              className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              onClick={onDelete}
              className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-3 w-3" />
              Delete
            </button>
          </div>

          {/* Trigger type */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Trigger
            </label>
            <div className="flex gap-2">
              <button
                onClick={() =>
                  onUpdate({ trigger: "condition", actionId: undefined })
                }
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm transition-colors",
                  triggerType === "condition"
                    ? "bg-primary text-primary-foreground"
                    : "bg-accent text-muted-foreground"
                )}
              >
                Condition
              </button>
              <button
                onClick={() => onUpdate({ trigger: "action" })}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm transition-colors",
                  triggerType === "action"
                    ? "bg-primary text-primary-foreground"
                    : "bg-accent text-muted-foreground"
                )}
              >
                Action
              </button>
            </div>
          </div>

          {/* Action ID (for action trigger) */}
          {triggerType === "action" && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Action ID
              </label>
              <input
                type="text"
                value={rule.actionId ?? ""}
                onChange={(e) => onUpdate({ actionId: e.target.value })}
                placeholder="e.g. eat_apple, rest, attack"
                className="w-full rounded-lg border border-border bg-background px-3 py-1.5 font-mono text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <p className="mt-1 text-xs text-muted-foreground/40">
                Custom components call{" "}
                <code className="text-primary">
                  executeAction("{rule.actionId || "..."}")
                </code>
              </p>
            </div>
          )}

          {/* Condition logic */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Match
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => onUpdate({ conditionLogic: "all" })}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm transition-colors",
                  rule.conditionLogic === "all"
                    ? "bg-primary text-primary-foreground"
                    : "bg-accent text-muted-foreground"
                )}
              >
                All (AND)
              </button>
              <button
                onClick={() => onUpdate({ conditionLogic: "any" })}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm transition-colors",
                  rule.conditionLogic === "any"
                    ? "bg-primary text-primary-foreground"
                    : "bg-accent text-muted-foreground"
                )}
              >
                Any (OR)
              </button>
            </div>
          </div>

          {/* Conditions */}
          <ConditionEditor
            conditions={rule.conditions}
            variables={variables}
            onChange={(conditions) => onUpdate({ conditions })}
            label={
              triggerType === "action" ? "Pre-conditions" : "Conditions"
            }
          />

          {/* Effects */}
          <EffectEditor
            effects={rule.effects}
            variables={variables}
            onChange={(effects) => onUpdate({ effects })}
          />

          {/* Audio Effects */}
          {audioTracks.length > 0 && (
            <AudioEffectSection
              audioEffects={rule.audioEffects ?? []}
              audioTracks={audioTracks}
              onChange={(audioEffects) => onUpdate({ audioEffects })}
            />
          )}

          {/* Notification (action rules only) */}
          {triggerType === "action" && (
            <div className="space-y-3 rounded-lg border border-border bg-accent/30 p-3">
              <label className="block text-sm font-medium text-foreground">
                AI Notification
              </label>
              <div className="flex gap-2">
                {(["silent", "always", "conditional"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => onUpdate({ notification: mode })}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-sm capitalize transition-colors",
                      notificationMode === mode
                        ? "bg-primary text-primary-foreground"
                        : "bg-accent text-muted-foreground"
                    )}
                  >
                    {mode}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground/40">
                {notificationMode === "silent" &&
                  "Changes apply locally. AI learns about them in the next message's state snapshot."}
                {notificationMode === "always" &&
                  "Always sends a message to the AI when this action fires."}
                {notificationMode === "conditional" &&
                  "Sends a message only when notification conditions are met."}
              </p>

              {notificationMode !== "silent" && (
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-foreground">
                    Message Template
                  </label>
                  <input
                    type="text"
                    value={rule.notificationTemplate ?? ""}
                    onChange={(e) =>
                      onUpdate({ notificationTemplate: e.target.value })
                    }
                    placeholder="User ate {item}. Hunger: {hunger}."
                    className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <p className="mt-1 text-xs text-muted-foreground/40">
                    Use <code className="text-primary">{"{variableId}"}</code>{" "}
                    for variable values
                  </p>
                </div>
              )}

              {notificationMode === "conditional" && (
                <ConditionEditor
                  conditions={rule.notificationConditions ?? []}
                  variables={variables}
                  onChange={(notificationConditions) =>
                    onUpdate({ notificationConditions })
                  }
                  label="Notify when"
                />
              )}
            </div>
          )}

          {/* Priority */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Priority
            </label>
            <input
              type="number"
              value={rule.priority}
              onChange={(e) =>
                onUpdate({ priority: parseInt(e.target.value) || 0 })
              }
              className="w-24 rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
      )}
    </div>
  );
}

/** Inline audio effect editor */
function AudioEffectSection({
  audioEffects,
  audioTracks,
  onChange,
}: {
  audioEffects: AudioEffect[];
  audioTracks: AudioTrack[];
  onChange: (effects: AudioEffect[]) => void;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">
          Audio Effects
        </label>
        <button
          onClick={() =>
            onChange([
              ...audioEffects,
              { trackId: audioTracks[0]!.id, action: "play" },
            ])
          }
          className="text-xs text-primary hover:underline"
        >
          + Add
        </button>
      </div>
      {audioEffects.length === 0 ? (
        <p className="text-xs text-muted-foreground/40">No audio effects</p>
      ) : (
        <div className="space-y-2">
          {audioEffects.map((ae, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-lg border border-border bg-accent/50 p-2"
            >
              <select
                value={ae.trackId}
                onChange={(e) => {
                  const updated = [...audioEffects];
                  updated[i] = { ...ae, trackId: e.target.value };
                  onChange(updated);
                }}
                className="rounded border border-border bg-background px-2 py-1 text-xs text-foreground"
              >
                {audioTracks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <select
                value={ae.action}
                onChange={(e) => {
                  const updated = [...audioEffects];
                  updated[i] = {
                    ...ae,
                    action: e.target.value as AudioEffect["action"],
                  };
                  onChange(updated);
                }}
                className="rounded border border-border bg-background px-2 py-1 text-xs text-foreground"
              >
                <option value="play">Play</option>
                <option value="stop">Stop</option>
                <option value="crossfade">Crossfade</option>
                <option value="volume">Volume</option>
              </select>
              <button
                onClick={() =>
                  onChange(audioEffects.filter((_, idx) => idx !== i))
                }
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
