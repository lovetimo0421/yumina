import { useState } from "react";
import { Plus, Trash2, FileText, PackagePlus, ChevronDown, Layers, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/stores/editor";
import { ENTRY_PRESET_PACKS } from "@/lib/entry-presets";
import type { WorldEntry } from "@yumina/engine";

const SECONDARY_LOGIC_OPTIONS: { value: NonNullable<WorldEntry["secondaryKeywordLogic"]>; label: string; hint: string }[] = [
  { value: "AND_ANY", label: "AND ANY", hint: "Primary matches AND any secondary matches" },
  { value: "AND_ALL", label: "AND ALL", hint: "Primary matches AND all secondaries match" },
  { value: "NOT_ANY", label: "NOT ANY", hint: "Primary matches AND no secondaries match" },
  { value: "NOT_ALL", label: "NOT ALL", hint: "Primary matches AND not all secondaries match" },
];

const ROLES: { value: WorldEntry["role"]; label: string }[] = [
  { value: "system", label: "System" },
  { value: "character", label: "Character" },
  { value: "personality", label: "Personality" },
  { value: "scenario", label: "Scenario" },
  { value: "lore", label: "Lore" },
  { value: "plot", label: "Plot" },
  { value: "style", label: "Style" },
  { value: "example", label: "Example" },
  { value: "greeting", label: "Greeting" },
  { value: "custom", label: "Custom" },
];

const POSITIONS: { value: WorldEntry["position"]; label: string; hint: string }[] = [
  { value: "top", label: "Top", hint: "System instructions, main prompt" },
  { value: "before_char", label: "Before Character", hint: "World info before char definition" },
  { value: "character", label: "Character", hint: "Description + personality" },
  { value: "after_char", label: "After Character", hint: "Scenario, supplementary lore" },
  { value: "persona", label: "Persona", hint: "User persona / self-description" },
  { value: "bottom", label: "Bottom", hint: "Format instructions, author's notes" },
  { value: "depth", label: "Depth", hint: "Injected N messages from end" },
  { value: "greeting", label: "Greeting", hint: "First assistant message" },
  { value: "post_history", label: "Post-History", hint: "After all chat (jailbreak)" },
];

const ROLE_FILTER_TABS = [
  { value: "all" as const, label: "All" },
  ...ROLES,
];

const ROLE_COLORS: Record<string, string> = {
  system: "text-blue-400",
  character: "text-emerald-400",
  personality: "text-teal-400",
  scenario: "text-amber-400",
  lore: "text-purple-400",
  plot: "text-rose-400",
  style: "text-pink-400",
  example: "text-cyan-400",
  greeting: "text-yellow-400",
  custom: "text-muted-foreground",
};

/** Position slots in prompt order (for the preview) */
const SYSTEM_POSITIONS: WorldEntry["position"][] = [
  "top",
  "before_char",
  "character",
  "after_char",
  "persona",
  "bottom",
];

export function EntriesSection() {
  const { worldDraft, addEntry, updateEntry, removeEntry, importEntryPack, setSettings } =
    useEditorStore();
  const [showPackMenu, setShowPackMenu] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(
    worldDraft.entries[0]?.id ?? null
  );
  const [roleFilter, setRoleFilter] = useState<WorldEntry["role"] | "all">("all");
  const [showPreview, setShowPreview] = useState(false);

  const filteredEntries =
    roleFilter === "all"
      ? worldDraft.entries
      : worldDraft.entries.filter((e) => e.role === roleFilter);

  const selected = worldDraft.entries.find((e) => e.id === selectedId);
  const templateVars = worldDraft.variables.map((v) => `{{${v.id}}}`);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Entries</h2>
          <p className="mt-1 text-sm text-muted-foreground/50">
            All content injected into the prompt — characters, lore, system
            instructions, greeting
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Prompt Preview Toggle */}
          <button
            onClick={() => setShowPreview(!showPreview)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium transition-colors",
              showPreview
                ? "bg-primary/10 text-primary border-primary/30"
                : "text-foreground hover:bg-accent"
            )}
          >
            <Layers className="h-3.5 w-3.5" />
            Preview
          </button>

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
                {ENTRY_PRESET_PACKS.map((pack) => (
                  <button
                    key={pack.id}
                    onClick={() => {
                      importEntryPack(pack.entries);
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
                      {pack.entries.length} entries ({pack.entries.filter((e) => e.enabled).length} enabled)
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Add Entry */}
          <button
            onClick={() => {
              const role = roleFilter === "all" ? "custom" : roleFilter;
              const position =
                role === "greeting"
                  ? "greeting"
                  : role === "system"
                    ? "top"
                    : role === "character" || role === "personality"
                      ? "character"
                      : "after_char";
              addEntry(role as WorldEntry["role"], position as WorldEntry["position"]);
              const entries = useEditorStore.getState().worldDraft.entries;
              setSelectedId(entries[entries.length - 1]?.id ?? null);
            }}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Entry
          </button>
        </div>
      </div>

      {/* Prompt Structure Preview */}
      {showPreview && (
        <PromptPreview
          entries={worldDraft.entries}
          onSelectEntry={(id) => setSelectedId(id)}
          selectedId={selectedId}
        />
      )}

      {/* Role filter tabs */}
      <div className="flex flex-wrap gap-1">
        {ROLE_FILTER_TABS.map((tab) => {
          const count =
            tab.value === "all"
              ? worldDraft.entries.length
              : worldDraft.entries.filter((e) => e.role === tab.value).length;
          return (
            <button
              key={tab.value}
              onClick={() => setRoleFilter(tab.value)}
              className={cn(
                "rounded-md px-2 py-1 text-xs transition-colors",
                roleFilter === tab.value
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              {tab.label}
              {count > 0 && (
                <span className="ml-1 text-muted-foreground/50">{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Entry Retrieval + Player Name — collapsible settings */}
      <details className="group rounded-lg border border-border bg-background/50">
        <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-medium text-muted-foreground/60 hover:text-foreground transition-colors">
          <Settings2 className="h-3.5 w-3.5" />
          <span>Entry Settings</span>
          <ChevronDown className="ml-auto h-3.5 w-3.5 transition-transform group-open:rotate-180" />
        </summary>
        <div className="space-y-4 border-t border-border px-4 pb-4 pt-3">
          {/* Player Name */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Player Character Name
            </label>
            <input
              type="text"
              value={worldDraft.settings.playerName ?? "User"}
              onChange={(e) =>
                setSettings("playerName", e.target.value || "User")
              }
              placeholder="User"
              className="w-60 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="mt-1 text-xs text-muted-foreground/40">
              Resolves the {"{{user}}"} macro. Leave as "User" if the player defines their own name.
            </p>
          </div>

          {/* Scan Depth */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Scan Depth
            </label>
            <input
              type="number"
              value={worldDraft.settings.lorebookScanDepth ?? 2}
              onChange={(e) =>
                setSettings("lorebookScanDepth", parseInt(e.target.value) || 2)
              }
              min={1}
              max={50}
              className="w-40 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="mt-1 text-xs text-muted-foreground/40">
              Number of recent messages to scan for keyword matches (1 - 50)
            </p>
          </div>

          {/* Recursion Depth */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Recursion Depth
            </label>
            <input
              type="number"
              value={worldDraft.settings.lorebookRecursionDepth ?? 0}
              onChange={(e) =>
                setSettings(
                  "lorebookRecursionDepth",
                  Math.min(Math.max(parseInt(e.target.value) || 0, 0), 10)
                )
              }
              min={0}
              max={10}
              className="w-40 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="mt-1 text-xs text-muted-foreground/40">
              Max depth for cascading entry triggers. 0 = disabled.
            </p>
          </div>
        </div>
      </details>

      {filteredEntries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-12 text-center">
          <FileText className="mx-auto h-8 w-8 text-muted-foreground/20" />
          <p className="mt-2 text-sm text-muted-foreground/40">
            No entries yet. Add one to get started.
          </p>
        </div>
      ) : (
        <div className="flex gap-4">
          {/* Entry list */}
          <div className="w-52 shrink-0 space-y-1">
            {filteredEntries.map((entry) => (
              <button
                key={entry.id}
                onClick={() => setSelectedId(entry.id)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                  selectedId === entry.id
                    ? "active-surface text-foreground"
                    : "text-muted-foreground hover-surface"
                )}
              >
                <FileText className="h-3.5 w-3.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <span className="block truncate">
                    {entry.name || "Unnamed"}
                  </span>
                  <span className="block truncate text-[10px] text-muted-foreground/40">
                    {entry.role} / {entry.position}
                  </span>
                </div>
                {entry.alwaysSend && (
                  <span className="shrink-0 rounded bg-primary/10 px-1 py-0.5 text-[9px] text-primary">
                    A
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Entry form */}
          {selected && (
            <div className="flex-1 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-foreground">Edit Entry</h3>
                <button
                  onClick={() => {
                    removeEntry(selected.id);
                    const entries =
                      useEditorStore.getState().worldDraft.entries;
                    setSelectedId(entries[0]?.id ?? null);
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
                    updateEntry(selected.id, { name: e.target.value })
                  }
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {/* Role + Position */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Role
                  </label>
                  <select
                    value={selected.role}
                    onChange={(e) =>
                      updateEntry(selected.id, {
                        role: e.target.value as WorldEntry["role"],
                      })
                    }
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring [&>option]:bg-popover"
                  >
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Position
                  </label>
                  <select
                    value={selected.position}
                    onChange={(e) =>
                      updateEntry(selected.id, {
                        position: e.target.value as WorldEntry["position"],
                      })
                    }
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring [&>option]:bg-popover"
                  >
                    {POSITIONS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Depth (for position="depth") */}
              {selected.position === "depth" && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    Depth (messages from end)
                  </label>
                  <input
                    type="number"
                    value={selected.depth ?? 4}
                    onChange={(e) =>
                      updateEntry(selected.id, {
                        depth: parseInt(e.target.value) || 4,
                      })
                    }
                    min={1}
                    max={100}
                    className="w-32 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              )}

              {/* Content */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Content
                </label>
                <textarea
                  value={selected.content}
                  onChange={(e) =>
                    updateEntry(selected.id, { content: e.target.value })
                  }
                  rows={8}
                  placeholder="Entry content..."
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-ring resize-y"
                />
              </div>

              {/* Keywords */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Keywords (comma-separated)
                </label>
                <input
                  type="text"
                  value={selected.keywords.join(", ")}
                  onChange={(e) =>
                    updateEntry(selected.id, {
                      keywords: e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                  placeholder="tavern, inn, drink"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-ring"
                />
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
                    updateEntry(selected.id, {
                      priority: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-40 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <p className="mt-1 text-xs text-muted-foreground/40">
                  Higher priority = placed earlier within position slot
                </p>
              </div>

              {/* Toggles */}
              <div className="flex gap-6">
                <label className="flex items-center gap-2.5 text-sm font-medium text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selected.enabled}
                    onChange={(e) =>
                      updateEntry(selected.id, { enabled: e.target.checked })
                    }
                    className="rounded accent-primary"
                  />
                  Enabled
                </label>
                <label className="flex items-center gap-2.5 text-sm font-medium text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selected.alwaysSend}
                    onChange={(e) =>
                      updateEntry(selected.id, {
                        alwaysSend: e.target.checked,
                      })
                    }
                    className="rounded accent-primary"
                  />
                  Always Send
                </label>
              </div>

              {/* Advanced Matching */}
              <details className="group">
                <summary className="flex cursor-pointer items-center gap-1.5 text-sm font-medium text-muted-foreground/60 hover:text-foreground transition-colors">
                  <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
                  Advanced Matching
                </summary>
                <div className="mt-3 space-y-3 pl-5">
                  {/* Whole Word + Fuzzy Match */}
                  <div className="flex gap-6">
                    <label className="flex items-center gap-2.5 text-sm font-medium text-foreground cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selected.matchWholeWords ?? false}
                        onChange={(e) =>
                          updateEntry(selected.id, {
                            matchWholeWords: e.target.checked,
                          })
                        }
                        className="rounded accent-primary"
                      />
                      Whole Word
                    </label>
                    <label className="flex items-center gap-2.5 text-sm font-medium text-foreground cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selected.useFuzzyMatch ?? false}
                        onChange={(e) =>
                          updateEntry(selected.id, {
                            useFuzzyMatch: e.target.checked,
                          })
                        }
                        className="rounded accent-primary"
                      />
                      Fuzzy Match
                    </label>
                  </div>

                  {/* Secondary Keywords */}
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">
                      Secondary Keywords (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={(selected.secondaryKeywords ?? []).join(", ")}
                      onChange={(e) =>
                        updateEntry(selected.id, {
                          secondaryKeywords: e.target.value
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean),
                        })
                      }
                      placeholder="healing, restoration"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>

                  {/* Secondary Logic (only when secondary keywords exist) */}
                  {(selected.secondaryKeywords ?? []).length > 0 && (
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-foreground">
                        Secondary Logic
                      </label>
                      <select
                        value={selected.secondaryKeywordLogic ?? "AND_ANY"}
                        onChange={(e) =>
                          updateEntry(selected.id, {
                            secondaryKeywordLogic: e.target.value as WorldEntry["secondaryKeywordLogic"],
                          })
                        }
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring [&>option]:bg-popover"
                      >
                        {SECONDARY_LOGIC_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label} — {opt.hint}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Recursion toggles */}
                  <div className="flex gap-6">
                    <label className="flex items-center gap-2.5 text-sm font-medium text-foreground cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selected.preventRecursion ?? false}
                        onChange={(e) =>
                          updateEntry(selected.id, {
                            preventRecursion: e.target.checked,
                          })
                        }
                        className="rounded accent-primary"
                      />
                      Prevent Recursion
                    </label>
                    <label className="flex items-center gap-2.5 text-sm font-medium text-foreground cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selected.excludeRecursion ?? false}
                        onChange={(e) =>
                          updateEntry(selected.id, {
                            excludeRecursion: e.target.checked,
                          })
                        }
                        className="rounded accent-primary"
                      />
                      Exclude from Recursion
                    </label>
                  </div>
                </div>
              </details>

              {/* Template variables helper */}
              {templateVars.length > 0 && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-muted-foreground/60">
                    Available Variables
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {templateVars.map((v) => (
                      <code
                        key={v}
                        className="rounded bg-accent px-1.5 py-0.5 text-xs text-primary"
                      >
                        {v}
                      </code>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Visual prompt structure preview */
function PromptPreview({
  entries,
  onSelectEntry,
  selectedId,
}: {
  entries: WorldEntry[];
  onSelectEntry: (id: string) => void;
  selectedId: string | null;
}) {
  const enabledEntries = entries.filter((e) => e.enabled);

  // Group by position for system prompt slots
  const systemSlots = SYSTEM_POSITIONS.map((pos) => ({
    position: pos,
    label: POSITIONS.find((p) => p.value === pos)?.label ?? pos,
    entries: enabledEntries
      .filter((e) => e.position === pos)
      .sort((a, b) => b.priority - a.priority),
  }));

  // Depth entries
  const depthEntries = enabledEntries
    .filter((e) => e.position === "depth")
    .sort((a, b) => (b.depth ?? 0) - (a.depth ?? 0));

  // Post-history entries
  const postHistoryEntries = enabledEntries
    .filter((e) => e.position === "post_history")
    .sort((a, b) => b.priority - a.priority);

  // Greeting entries
  const greetingEntries = enabledEntries
    .filter((e) => e.position === "greeting")
    .sort((a, b) => b.priority - a.priority);

  const entryNode = (entry: WorldEntry, extra?: string) => (
    <button
      key={entry.id}
      onClick={() => onSelectEntry(entry.id)}
      className={cn(
        "flex items-center gap-2 rounded px-2 py-0.5 text-left text-xs transition-colors w-full",
        selectedId === entry.id
          ? "bg-primary/10 text-primary"
          : "hover:bg-accent text-muted-foreground"
      )}
    >
      <span className={cn("shrink-0", ROLE_COLORS[entry.role] ?? "text-muted-foreground")}>
        {entry.alwaysSend ? "\u2502" : "\u2502"}
      </span>
      <span className="truncate flex-1">
        {entry.name}
        {extra && <span className="text-muted-foreground/40 ml-1">{extra}</span>}
      </span>
      <span className="shrink-0 text-[10px] text-muted-foreground/30">
        p{entry.priority}
      </span>
      {entry.alwaysSend && (
        <span className="shrink-0 text-[9px] text-primary/50">A</span>
      )}
    </button>
  );

  return (
    <div className="rounded-lg border border-border bg-background/50 text-xs font-mono">
      {/* System Prompt */}
      <div className="border-b border-border px-3 py-1.5 text-muted-foreground/60 font-semibold">
        System Prompt
      </div>
      <div className="px-2 py-1 space-y-0.5">
        {systemSlots.map((slot) =>
          slot.entries.length > 0 ? (
            <div key={slot.position}>
              <div className="px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground/30">
                {slot.label}
              </div>
              {slot.entries.map((e) => entryNode(e))}
            </div>
          ) : null
        )}
        {systemSlots.every((s) => s.entries.length === 0) && (
          <div className="px-2 py-1 text-muted-foreground/30 italic">
            No system entries
          </div>
        )}
      </div>

      {/* Chat History */}
      <div className="border-t border-border px-3 py-1.5 text-muted-foreground/60 font-semibold">
        Chat History
      </div>
      <div className="px-2 py-1 space-y-0.5">
        {depthEntries.length > 0 ? (
          depthEntries.map((e) =>
            entryNode(e, `depth ${e.depth ?? 0}`)
          )
        ) : (
          <div className="px-2 py-0.5 text-muted-foreground/20 italic">
            ... messages ...
          </div>
        )}
        {depthEntries.length > 0 && (
          <div className="px-2 py-0.5 text-muted-foreground/20 italic">
            ... messages ...
          </div>
        )}
      </div>

      {/* Post-History */}
      {postHistoryEntries.length > 0 && (
        <>
          <div className="border-t border-border px-3 py-1.5 text-muted-foreground/60 font-semibold">
            Post-History
          </div>
          <div className="px-2 py-1 space-y-0.5">
            {postHistoryEntries.map((e) => entryNode(e))}
          </div>
        </>
      )}

      {/* Greeting (separate) */}
      {greetingEntries.length > 0 && (
        <>
          <div className="border-t border-border px-3 py-1.5 text-muted-foreground/60 font-semibold">
            Greeting (first message)
          </div>
          <div className="px-2 py-1 space-y-0.5">
            {greetingEntries.map((e) => entryNode(e))}
          </div>
        </>
      )}
    </div>
  );
}
