import { useState } from "react";
import type { IDockviewPanelProps } from "dockview-react";
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Users,
  BookOpen,
  Swords,
  Palette,
  Sparkles,
  Shield,
  Scroll,
  PenTool,
  Hand,
} from "lucide-react";
import { useEditorStore } from "@/stores/editor";
import type { WorldEntry } from "@yumina/engine";

const TABS = [
  { id: "all" as const, label: "All", icon: BookOpen },
  { id: "system" as const, label: "System", icon: Shield },
  { id: "character" as const, label: "Character", icon: Users },
  { id: "personality" as const, label: "Personality", icon: Users },
  { id: "scenario" as const, label: "Scenario", icon: Scroll },
  { id: "lore" as const, label: "Lore", icon: BookOpen },
  { id: "plot" as const, label: "Plot", icon: Swords },
  { id: "style" as const, label: "Style", icon: Palette },
  { id: "example" as const, label: "Example", icon: PenTool },
  { id: "greeting" as const, label: "Greeting", icon: Hand },
  { id: "custom" as const, label: "Custom", icon: Sparkles },
] as const;

type TabType = (typeof TABS)[number]["id"];

const POSITIONS: { value: WorldEntry["position"]; label: string }[] = [
  { value: "top", label: "Top" },
  { value: "before_char", label: "Before Char" },
  { value: "character", label: "Character" },
  { value: "after_char", label: "After Char" },
  { value: "persona", label: "Persona" },
  { value: "bottom", label: "Bottom" },
  { value: "depth", label: "Depth" },
  { value: "greeting", label: "Greeting" },
  { value: "post_history", label: "Post-History" },
];

export function LorebookPanel(_props: IDockviewPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>("all");

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Tab bar */}
      <div className="flex flex-wrap border-b border-border">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs transition-colors ${
              activeTab === tab.id
                ? "border-b-2 border-primary text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="h-3 w-3" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <EntriesTab roleFilter={activeTab === "all" ? null : activeTab} />
      </div>
    </div>
  );
}

function EntriesTab({ roleFilter }: { roleFilter: WorldEntry["role"] | null }) {
  const { worldDraft, addEntry, updateEntry, removeEntry } = useEditorStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const entries = roleFilter
    ? worldDraft.entries.filter((e) => e.role === roleFilter)
    : worldDraft.entries;

  return (
    <div className="p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          {entries.length} entries
        </span>
        <button
          onClick={() => {
            const role = roleFilter ?? "custom";
            const position =
              role === "greeting"
                ? "greeting"
                : role === "system"
                  ? "top"
                  : role === "character" || role === "personality"
                    ? "character"
                    : "after_char";
            addEntry(role, position as WorldEntry["position"]);
          }}
          className="hover-surface flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground"
        >
          <Plus className="h-3 w-3" />
          Add
        </button>
      </div>

      {entries.map((entry) => (
        <div key={entry.id} className="rounded-lg border border-border">
          <button
            onClick={() =>
              setExpandedId(expandedId === entry.id ? null : entry.id)
            }
            className="flex w-full items-center gap-2 px-3 py-2"
          >
            {expandedId === entry.id ? (
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
            )}
            <span className="flex-1 text-left text-xs text-foreground">
              {entry.name}
            </span>
            <span className="rounded bg-accent px-1 py-0.5 text-[10px] text-muted-foreground">
              {entry.position}
            </span>
            {entry.alwaysSend && (
              <span className="rounded bg-primary/10 px-1 py-0.5 text-[10px] text-primary">
                ALWAYS
              </span>
            )}
            <span
              className={`rounded px-1 py-0.5 text-[10px] ${
                entry.enabled
                  ? "bg-green-500/10 text-green-400"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {entry.enabled ? "ON" : "OFF"}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeEntry(entry.id);
              }}
              className="hover-surface rounded p-0.5 text-muted-foreground"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </button>

          {expandedId === entry.id && (
            <div className="space-y-2 border-t border-border px-3 py-2">
              <input
                type="text"
                value={entry.name}
                onChange={(e) =>
                  updateEntry(entry.id, { name: e.target.value })
                }
                placeholder="Entry name"
                className="w-full rounded bg-muted px-2 py-1 text-xs text-foreground focus:outline-none"
              />

              <textarea
                value={entry.content}
                onChange={(e) =>
                  updateEntry(entry.id, { content: e.target.value })
                }
                placeholder="Entry content..."
                rows={4}
                className="w-full resize-none rounded bg-muted px-2 py-1 text-xs text-foreground focus:outline-none"
              />

              {/* Role + Position */}
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-[10px] text-muted-foreground">
                    Role
                  </label>
                  <select
                    value={entry.role}
                    onChange={(e) =>
                      updateEntry(entry.id, {
                        role: e.target.value as WorldEntry["role"],
                      })
                    }
                    className="w-full rounded bg-muted px-2 py-1 text-xs text-foreground focus:outline-none [&>option]:bg-popover"
                  >
                    <option value="system">System</option>
                    <option value="character">Character</option>
                    <option value="personality">Personality</option>
                    <option value="scenario">Scenario</option>
                    <option value="lore">Lore</option>
                    <option value="plot">Plot</option>
                    <option value="style">Style</option>
                    <option value="example">Example</option>
                    <option value="greeting">Greeting</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-[10px] text-muted-foreground">
                    Position
                  </label>
                  <select
                    value={entry.position}
                    onChange={(e) =>
                      updateEntry(entry.id, {
                        position: e.target.value as WorldEntry["position"],
                      })
                    }
                    className="w-full rounded bg-muted px-2 py-1 text-xs text-foreground focus:outline-none [&>option]:bg-popover"
                  >
                    {POSITIONS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Depth field (only for depth position) */}
              {entry.position === "depth" && (
                <div>
                  <label className="text-[10px] text-muted-foreground">
                    Depth (msgs from end)
                  </label>
                  <input
                    type="number"
                    value={entry.depth ?? 4}
                    onChange={(e) =>
                      updateEntry(entry.id, {
                        depth: parseInt(e.target.value) || 4,
                      })
                    }
                    min={1}
                    className="w-full rounded bg-muted px-2 py-1 text-xs text-foreground focus:outline-none"
                  />
                </div>
              )}

              {/* Keywords */}
              <div>
                <label className="text-[10px] text-muted-foreground">
                  Keywords (comma-separated)
                </label>
                <input
                  type="text"
                  value={entry.keywords.join(", ")}
                  onChange={(e) =>
                    updateEntry(entry.id, {
                      keywords: e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                  placeholder="tavern, inn, drink"
                  className="w-full rounded bg-muted px-2 py-1 text-xs text-foreground focus:outline-none"
                />
              </div>

              {/* Priority + Insertion Order */}
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-[10px] text-muted-foreground">
                    Priority
                  </label>
                  <input
                    type="number"
                    value={entry.priority}
                    onChange={(e) =>
                      updateEntry(entry.id, {
                        priority: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full rounded bg-muted px-2 py-1 text-xs text-foreground focus:outline-none"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={entry.enabled}
                    onChange={(e) =>
                      updateEntry(entry.id, {
                        enabled: e.target.checked,
                      })
                    }
                    className="accent-primary"
                  />
                  <span className="text-xs text-foreground">Enabled</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={entry.alwaysSend ?? false}
                    onChange={(e) =>
                      updateEntry(entry.id, {
                        alwaysSend: e.target.checked,
                      })
                    }
                    className="accent-primary"
                  />
                  <span className="text-xs text-foreground">Always Send</span>
                </label>
              </div>
              {entry.alwaysSend && (
                <p className="text-[10px] text-muted-foreground/60">
                  This entry is always injected into the prompt, regardless of
                  keywords or conditions. Not subject to token budget.
                </p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
