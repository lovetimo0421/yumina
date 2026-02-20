import { useState } from "react";
import { Plus, Trash2, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/stores/editor";

export function CharactersSection() {
  const { worldDraft, addCharacter, updateCharacter, removeCharacter } =
    useEditorStore();
  const [selectedId, setSelectedId] = useState<string | null>(
    worldDraft.characters[0]?.id ?? null
  );

  const selected = worldDraft.characters.find((c) => c.id === selectedId);

  // Available template variables
  const templateVars = worldDraft.variables.map((v) => `{{${v.id}}}`);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Characters</h2>
          <p className="mt-1 text-sm text-muted-foreground/50">
            Define the characters that inhabit your world
          </p>
        </div>
        <button
          onClick={() => {
            addCharacter();
            const chars = useEditorStore.getState().worldDraft.characters;
            setSelectedId(chars[chars.length - 1]?.id ?? null);
          }}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Character
        </button>
      </div>

      {worldDraft.characters.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-12 text-center">
          <User className="mx-auto h-8 w-8 text-muted-foreground/20" />
          <p className="mt-2 text-sm text-muted-foreground/40">
            No characters yet. Add one to get started.
          </p>
        </div>
      ) : (
        <div className="flex gap-4">
          {/* Character list */}
          <div className="w-48 shrink-0 space-y-1">
            {worldDraft.characters.map((char) => (
              <button
                key={char.id}
                onClick={() => setSelectedId(char.id)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                  selectedId === char.id
                    ? "active-surface text-foreground"
                    : "text-muted-foreground hover-surface"
                )}
              >
                <User className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{char.name || "Unnamed"}</span>
              </button>
            ))}
          </div>

          {/* Character form */}
          {selected && (
            <div className="flex-1 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-foreground">
                  Edit Character
                </h3>
                <button
                  onClick={() => {
                    removeCharacter(selected.id);
                    const chars =
                      useEditorStore.getState().worldDraft.characters;
                    setSelectedId(chars[0]?.id ?? null);
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
                    updateCharacter(selected.id, { name: e.target.value })
                  }
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {/* Description */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Description
                </label>
                <textarea
                  value={selected.description}
                  onChange={(e) =>
                    updateCharacter(selected.id, {
                      description: e.target.value,
                    })
                  }
                  rows={3}
                  placeholder="Brief description of this character..."
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>

              {/* System Prompt */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  System Prompt
                </label>
                <textarea
                  value={selected.systemPrompt}
                  onChange={(e) =>
                    updateCharacter(selected.id, {
                      systemPrompt: e.target.value,
                    })
                  }
                  rows={8}
                  placeholder="You are a wise old wizard who..."
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-ring resize-y"
                />
              </div>

              {/* Avatar URL */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Avatar URL
                </label>
                <input
                  type="text"
                  value={selected.avatar ?? ""}
                  onChange={(e) =>
                    updateCharacter(selected.id, { avatar: e.target.value })
                  }
                  placeholder="https://example.com/avatar.png"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

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
