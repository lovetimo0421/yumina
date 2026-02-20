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
} from "lucide-react";
import { useEditorStore } from "@/stores/editor";
import type { LorebookEntry } from "@yumina/engine";

const TABS = [
  { id: "character" as const, label: "Characters", icon: Users },
  { id: "lore" as const, label: "Lore", icon: BookOpen },
  { id: "plot" as const, label: "Plot", icon: Swords },
  { id: "style" as const, label: "Style", icon: Palette },
  { id: "custom" as const, label: "Custom", icon: Sparkles },
] as const;

type TabType = (typeof TABS)[number]["id"];

export function LorebookPanel(_props: IDockviewPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>("character");

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Tab bar */}
      <div className="flex border-b border-border">
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
        {activeTab === "character" ? (
          <CharactersTab />
        ) : (
          <EntriesTab type={activeTab} />
        )}
      </div>
    </div>
  );
}

function CharactersTab() {
  const { worldDraft, addCharacter, updateCharacter, removeCharacter } =
    useEditorStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          {worldDraft.characters.length} characters
        </span>
        <button
          onClick={addCharacter}
          className="hover-surface flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground"
        >
          <Plus className="h-3 w-3" />
          Add
        </button>
      </div>

      {worldDraft.characters.map((ch) => (
        <div key={ch.id} className="rounded-lg border border-border">
          <button
            onClick={() =>
              setExpandedId(expandedId === ch.id ? null : ch.id)
            }
            className="flex w-full items-center gap-2 px-3 py-2"
          >
            {expandedId === ch.id ? (
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
            )}
            <span className="flex-1 text-left text-xs text-foreground">
              {ch.name}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeCharacter(ch.id);
              }}
              className="hover-surface rounded p-0.5 text-muted-foreground"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </button>

          {expandedId === ch.id && (
            <div className="space-y-2 border-t border-border px-3 py-2">
              <input
                type="text"
                value={ch.name}
                onChange={(e) =>
                  updateCharacter(ch.id, { name: e.target.value })
                }
                placeholder="Name"
                className="w-full rounded bg-muted px-2 py-1 text-xs text-foreground focus:outline-none"
              />
              <textarea
                value={ch.description}
                onChange={(e) =>
                  updateCharacter(ch.id, { description: e.target.value })
                }
                placeholder="Description..."
                rows={2}
                className="w-full resize-none rounded bg-muted px-2 py-1 text-xs text-foreground focus:outline-none"
              />
              <textarea
                value={ch.systemPrompt}
                onChange={(e) =>
                  updateCharacter(ch.id, { systemPrompt: e.target.value })
                }
                placeholder="System prompt..."
                rows={3}
                className="w-full resize-none rounded bg-muted px-2 py-1 text-xs text-foreground focus:outline-none"
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function EntriesTab({ type }: { type: LorebookEntry["type"] }) {
  const { worldDraft, addLorebookEntry, updateLorebookEntry, removeLorebookEntry } =
    useEditorStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const entries = worldDraft.lorebookEntries.filter((e) => e.type === type);

  return (
    <div className="p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          {entries.length} entries
        </span>
        <button
          onClick={() => addLorebookEntry(type)}
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
                removeLorebookEntry(entry.id);
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
                  updateLorebookEntry(entry.id, { name: e.target.value })
                }
                placeholder="Entry name"
                className="w-full rounded bg-muted px-2 py-1 text-xs text-foreground focus:outline-none"
              />

              <textarea
                value={entry.content}
                onChange={(e) =>
                  updateLorebookEntry(entry.id, { content: e.target.value })
                }
                placeholder="Entry content (injected into prompt when matched)..."
                rows={4}
                className="w-full resize-none rounded bg-muted px-2 py-1 text-xs text-foreground focus:outline-none"
              />

              {/* Keywords */}
              <div>
                <label className="text-[10px] text-muted-foreground">
                  Keywords (comma-separated)
                </label>
                <input
                  type="text"
                  value={entry.keywords.join(", ")}
                  onChange={(e) =>
                    updateLorebookEntry(entry.id, {
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

              {/* Priority + Position */}
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-[10px] text-muted-foreground">
                    Priority
                  </label>
                  <input
                    type="number"
                    value={entry.priority}
                    onChange={(e) =>
                      updateLorebookEntry(entry.id, {
                        priority: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full rounded bg-muted px-2 py-1 text-xs text-foreground focus:outline-none"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] text-muted-foreground">
                    Position
                  </label>
                  <select
                    value={entry.position}
                    onChange={(e) =>
                      updateLorebookEntry(entry.id, {
                        position: e.target.value as "before" | "after",
                      })
                    }
                    className="w-full rounded bg-muted px-2 py-1 text-xs text-foreground focus:outline-none [&>option]:bg-popover"
                  >
                    <option value="after">After</option>
                    <option value="before">Before</option>
                  </select>
                </div>
              </div>

              {/* Toggles */}
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={entry.enabled}
                    onChange={(e) =>
                      updateLorebookEntry(entry.id, {
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
                      updateLorebookEntry(entry.id, {
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
