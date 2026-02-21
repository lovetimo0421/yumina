import { create } from "zustand";
import { toast } from "sonner";
import type {
  WorldDefinition,
  Variable,
  Rule,
  GameComponent,
  AudioTrack,
  WorldEntry,
  CustomComponent,
  DisplayTransform,
} from "@yumina/engine";
import { migrateWorldDefinition } from "@yumina/engine";
import type { VariablePresetPack } from "@/lib/variable-presets";
import type { WorldTemplate } from "@/lib/world-templates";

const apiBase = import.meta.env.VITE_API_URL || "";

const DRAFT_KEY = "yumina-editor-draft";
const AUTOSAVE_DELAY = 2000;
const MAX_HISTORY = 50;

function createEmptyWorld(): WorldDefinition {
  return {
    id: crypto.randomUUID(),
    version: "5.0.0",
    name: "",
    description: "",
    author: "",
    entries: [
      {
        id: "main-prompt",
        name: "Main Prompt",
        content: "Write {{char}}'s next reply in a fictional chat between {{char}} and {{user}}.",
        role: "system",
        position: "top",
        alwaysSend: true,
        keywords: [],
        conditions: [],
        conditionLogic: "all",
        priority: 100,
        enabled: true,
      },
    ],
    variables: [],
    rules: [],
    components: [],
    audioTracks: [],
    customComponents: [],
    displayTransforms: [],
    settings: {
      maxTokens: 12000,
      maxContext: 200000,
      temperature: 1.0,
      topP: 1,
      frequencyPenalty: 0,
      presencePenalty: 0,
      playerName: "User",
      structuredOutput: false,
      lorebookScanDepth: 2,
      lorebookRecursionDepth: 0,
    },
  };
}

export type EditorSection =
  | "entries"
  | "variables"
  | "components"
  | "audio"
  | "assets"
  | "rules"
  | "preview";

interface EditorState {
  worldDraft: WorldDefinition;
  serverWorldId: string | null;
  isDirty: boolean;
  activeSection: EditorSection;
  saving: boolean;

  // History
  _past: WorldDefinition[];
  _future: WorldDefinition[];
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;

  // Actions
  createNew: () => void;
  loadWorld: (worldId: string) => Promise<void>;
  setActiveSection: (section: EditorSection) => void;
  setField: <K extends keyof WorldDefinition>(
    key: K,
    value: WorldDefinition[K]
  ) => void;
  setSettings: (
    key: keyof WorldDefinition["settings"],
    value: string | number | boolean
  ) => void;

  // Entry actions (replaces character + lorebook)
  addEntry: (role?: WorldEntry["role"], position?: WorldEntry["position"]) => void;
  updateEntry: (id: string, updates: Partial<WorldEntry>) => void;
  removeEntry: (id: string) => void;
  importEntryPack: (entries: Omit<WorldEntry, "id">[]) => void;

  // Variable actions
  addVariable: () => void;
  updateVariable: (id: string, updates: Partial<Variable>) => void;
  removeVariable: (id: string) => void;
  importVariablePack: (pack: VariablePresetPack) => void;

  // Component actions
  addComponent: (type?: GameComponent["type"]) => void;
  updateComponent: (id: string, updates: Partial<GameComponent>) => void;
  removeComponent: (id: string) => void;
  reorderComponents: (componentIds: string[]) => void;

  // Audio track actions
  addAudioTrack: () => void;
  updateAudioTrack: (id: string, updates: Partial<AudioTrack>) => void;
  removeAudioTrack: (id: string) => void;

  // Custom component actions
  addCustomComponent: () => void;
  updateCustomComponent: (id: string, updates: Partial<CustomComponent>) => void;
  removeCustomComponent: (id: string) => void;

  // Display transform actions
  addDisplayTransform: () => void;
  updateDisplayTransform: (id: string, updates: Partial<DisplayTransform>) => void;
  removeDisplayTransform: (id: string) => void;

  // Rule actions
  addRule: () => void;
  updateRule: (id: string, updates: Partial<Rule>) => void;
  removeRule: (id: string) => void;
  reorderRules: (ruleIds: string[]) => void;

  // Templates & import
  loadTemplate: (template: WorldTemplate) => void;
  loadWorldDefinition: (def: WorldDefinition) => void;

  // Save
  saveDraft: () => Promise<void>;
  loadDraftFromStorage: () => void;
  clearDraft: () => void;
}

let autosaveTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleDraftSave(draft: WorldDefinition, serverId: string | null) {
  if (autosaveTimer) clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => {
    try {
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ draft, serverId, savedAt: Date.now() })
      );
    } catch {
      // localStorage might be full
    }
  }, AUTOSAVE_DELAY);
}

/**
 * Push current worldDraft onto the _past stack, apply newDraft, clear _future.
 * Returns the partial state update for set().
 */
function commitDraft(
  s: EditorState,
  newDraft: WorldDefinition
): Partial<EditorState> {
  const past = [...s._past, s.worldDraft].slice(-MAX_HISTORY);
  scheduleDraftSave(newDraft, s.serverWorldId);
  return {
    worldDraft: newDraft,
    isDirty: true,
    _past: past,
    _future: [],
    canUndo: true,
    canRedo: false,
  };
}

export const useEditorStore = create<EditorState>((set, get) => ({
  worldDraft: createEmptyWorld(),
  serverWorldId: null,
  isDirty: false,
  activeSection: "entries",
  saving: false,

  // History
  _past: [],
  _future: [],
  canUndo: false,
  canRedo: false,

  undo: () => {
    set((s) => {
      if (s._past.length === 0) return s;
      const previous = s._past[s._past.length - 1]!;
      const newPast = s._past.slice(0, -1);
      const newFuture = [s.worldDraft, ...s._future];
      scheduleDraftSave(previous, s.serverWorldId);
      return {
        worldDraft: previous,
        _past: newPast,
        _future: newFuture,
        canUndo: newPast.length > 0,
        canRedo: true,
        isDirty: true,
      };
    });
  },

  redo: () => {
    set((s) => {
      if (s._future.length === 0) return s;
      const next = s._future[0]!;
      const newFuture = s._future.slice(1);
      const newPast = [...s._past, s.worldDraft];
      scheduleDraftSave(next, s.serverWorldId);
      return {
        worldDraft: next,
        _past: newPast,
        _future: newFuture,
        canUndo: true,
        canRedo: newFuture.length > 0,
        isDirty: true,
      };
    });
  },

  createNew: () => {
    const draft = createEmptyWorld();
    set({
      worldDraft: draft,
      serverWorldId: null,
      isDirty: false,
      activeSection: "entries",
      _past: [],
      _future: [],
      canUndo: false,
      canRedo: false,
    });
    localStorage.removeItem(DRAFT_KEY);
  },

  loadWorld: async (worldId: string) => {
    try {
      const res = await fetch(`${apiBase}/api/worlds/${worldId}`, {
        credentials: "include",
      });
      if (!res.ok) return;
      const { data } = await res.json();
      const schema = (data.schema ?? {}) as WorldDefinition;

      // Build raw draft then migrate
      const rawDraft: WorldDefinition = {
        id: schema.id || data.id,
        version: schema.version || "1.0.0",
        name: schema.name || data.name || "",
        description: schema.description || data.description || "",
        author: schema.author || "",
        avatar: schema.avatar,
        entries: schema.entries || [],
        variables: schema.variables || [],
        rules: schema.rules || [],
        characters: schema.characters,
        components: schema.components || [],
        audioTracks: schema.audioTracks || [],
        lorebookEntries: schema.lorebookEntries,
        customComponents: schema.customComponents || [],
        displayTransforms: schema.displayTransforms || [],
        settings: {
          maxTokens: schema.settings?.maxTokens ?? 12000,
          maxContext: schema.settings?.maxContext ?? 200000,
          temperature: schema.settings?.temperature ?? 1.0,
          topP: schema.settings?.topP ?? 1,
          frequencyPenalty: schema.settings?.frequencyPenalty ?? 0,
          presencePenalty: schema.settings?.presencePenalty ?? 0,
          topK: schema.settings?.topK,
          minP: schema.settings?.minP,
          playerName: schema.settings?.playerName ?? "User",
          systemPrompt: schema.settings?.systemPrompt,
          greeting: schema.settings?.greeting,
          structuredOutput: schema.settings?.structuredOutput ?? false,
          lorebookScanDepth: schema.settings?.lorebookScanDepth ?? 2,
          lorebookRecursionDepth: schema.settings?.lorebookRecursionDepth ?? 0,
          layoutMode: schema.settings?.layoutMode,
          uiMode: schema.settings?.uiMode,
          fullScreenComponent: schema.settings?.fullScreenComponent ?? false,
        },
      };

      const draft = migrateWorldDefinition(rawDraft);

      set({
        worldDraft: draft,
        serverWorldId: data.id,
        isDirty: false,
        activeSection: "entries",
        _past: [],
        _future: [],
        canUndo: false,
        canRedo: false,
      });
    } catch {
      toast.error("Failed to load world");
    }
  },

  setActiveSection: (section) => set({ activeSection: section }),

  setField: (key, value) => {
    set((s) => {
      const draft = { ...s.worldDraft, [key]: value };
      return commitDraft(s, draft);
    });
  },

  setSettings: (key, value) => {
    set((s) => {
      const draft = {
        ...s.worldDraft,
        settings: { ...s.worldDraft.settings, [key]: value },
      };
      return commitDraft(s, draft);
    });
  },

  addEntry: (role = "custom", position = "after_char") => {
    set((s) => {
      const newEntry: WorldEntry = {
        id: crypto.randomUUID(),
        name: "New Entry",
        content: "",
        role,
        position,
        alwaysSend: false,
        keywords: [],
        conditions: [],
        conditionLogic: "all",
        priority: 0,
        enabled: true,
        matchWholeWords: false,
        useFuzzyMatch: false,
        secondaryKeywords: [],
        secondaryKeywordLogic: "AND_ANY",
        preventRecursion: false,
        excludeRecursion: false,
      };
      const draft = {
        ...s.worldDraft,
        entries: [...s.worldDraft.entries, newEntry],
      };
      return commitDraft(s, draft);
    });
  },

  updateEntry: (id, updates) => {
    set((s) => {
      const draft = {
        ...s.worldDraft,
        entries: s.worldDraft.entries.map((e) =>
          e.id === id ? { ...e, ...updates } : e
        ),
      };
      return commitDraft(s, draft);
    });
  },

  removeEntry: (id) => {
    set((s) => {
      const draft = {
        ...s.worldDraft,
        entries: s.worldDraft.entries.filter((e) => e.id !== id),
      };
      return commitDraft(s, draft);
    });
  },

  importEntryPack: (packEntries) => {
    set((s) => {
      const newEntries = packEntries.map((e) => ({
        ...e,
        id: crypto.randomUUID(),
      }));
      const draft = {
        ...s.worldDraft,
        entries: [...s.worldDraft.entries, ...newEntries],
      };
      return commitDraft(s, draft);
    });
  },

  addVariable: () => {
    set((s) => {
      const newVar: Variable = {
        id: `var_${Date.now()}`,
        name: "New Variable",
        type: "number",
        defaultValue: 0,
        description: "",
      };
      const draft = {
        ...s.worldDraft,
        variables: [...s.worldDraft.variables, newVar],
      };
      return commitDraft(s, draft);
    });
  },

  updateVariable: (id, updates) => {
    set((s) => {
      const draft = {
        ...s.worldDraft,
        variables: s.worldDraft.variables.map((v) =>
          v.id === id ? { ...v, ...updates } : v
        ),
      };
      return commitDraft(s, draft);
    });
  },

  removeVariable: (id) => {
    set((s) => {
      const draft = {
        ...s.worldDraft,
        variables: s.worldDraft.variables.filter((v) => v.id !== id),
      };
      return commitDraft(s, draft);
    });
  },

  importVariablePack: (pack) => {
    set((s) => {
      const existingIds = new Set(s.worldDraft.variables.map((v) => v.id));
      const newVars = pack.variables.filter((v) => !existingIds.has(v.id));
      const startOrder = s.worldDraft.components.length;
      const newComps = pack.components.map((c, i) => ({
        ...c,
        id: crypto.randomUUID(),
        order: startOrder + i,
      })) as GameComponent[];
      const draft = {
        ...s.worldDraft,
        variables: [...s.worldDraft.variables, ...newVars],
        components: [...s.worldDraft.components, ...newComps],
      };
      return commitDraft(s, draft);
    });
  },

  addComponent: (type = "stat-bar" as GameComponent["type"]) => {
    set((s) => {
      const newComp: GameComponent = {
        id: crypto.randomUUID(),
        type,
        name: "New Component",
        order: s.worldDraft.components.length,
        visible: true,
        config: { variableId: "" },
      } as GameComponent;
      const draft = {
        ...s.worldDraft,
        components: [...s.worldDraft.components, newComp],
      };
      return commitDraft(s, draft);
    });
  },

  updateComponent: (id, updates) => {
    set((s) => {
      const draft = {
        ...s.worldDraft,
        components: s.worldDraft.components.map((c) =>
          c.id === id ? ({ ...c, ...updates } as GameComponent) : c
        ),
      };
      return commitDraft(s, draft);
    });
  },

  removeComponent: (id) => {
    set((s) => {
      const draft = {
        ...s.worldDraft,
        components: s.worldDraft.components.filter((c) => c.id !== id),
      };
      return commitDraft(s, draft);
    });
  },

  reorderComponents: (componentIds) => {
    set((s) => {
      const compMap = new Map(s.worldDraft.components.map((c) => [c.id, c]));
      const reordered = componentIds
        .map((id, i) => {
          const comp = compMap.get(id);
          return comp ? { ...comp, order: i } : null;
        })
        .filter(Boolean) as GameComponent[];
      const draft = { ...s.worldDraft, components: reordered };
      return commitDraft(s, draft);
    });
  },

  addAudioTrack: () => {
    set((s) => {
      const newTrack: AudioTrack = {
        id: crypto.randomUUID(),
        name: "New Track",
        type: "bgm",
        url: "",
        loop: true,
        volume: 1,
      };
      const draft = {
        ...s.worldDraft,
        audioTracks: [...(s.worldDraft.audioTracks ?? []), newTrack],
      };
      return commitDraft(s, draft);
    });
  },

  updateAudioTrack: (id, updates) => {
    set((s) => {
      const draft = {
        ...s.worldDraft,
        audioTracks: (s.worldDraft.audioTracks ?? []).map((t) =>
          t.id === id ? { ...t, ...updates } : t
        ),
      };
      return commitDraft(s, draft);
    });
  },

  removeAudioTrack: (id) => {
    set((s) => {
      const draft = {
        ...s.worldDraft,
        audioTracks: (s.worldDraft.audioTracks ?? []).filter(
          (t) => t.id !== id
        ),
      };
      return commitDraft(s, draft);
    });
  },

  addCustomComponent: () => {
    set((s) => {
      const newComp: CustomComponent = {
        id: crypto.randomUUID(),
        name: "New Custom Component",
        tsxCode: `export default function MyComponent({ variables }) {\n  return <div>Hello World</div>;\n}`,
        description: "",
        order: s.worldDraft.customComponents.length,
        visible: true,
        updatedAt: new Date().toISOString(),
      };
      const draft = {
        ...s.worldDraft,
        customComponents: [...s.worldDraft.customComponents, newComp],
      };
      return commitDraft(s, draft);
    });
  },

  updateCustomComponent: (id, updates) => {
    set((s) => {
      const draft = {
        ...s.worldDraft,
        customComponents: s.worldDraft.customComponents.map((c) =>
          c.id === id
            ? { ...c, ...updates, updatedAt: new Date().toISOString() }
            : c
        ),
      };
      return commitDraft(s, draft);
    });
  },

  removeCustomComponent: (id) => {
    set((s) => {
      const draft = {
        ...s.worldDraft,
        customComponents: s.worldDraft.customComponents.filter(
          (c) => c.id !== id
        ),
      };
      return commitDraft(s, draft);
    });
  },

  addDisplayTransform: () => {
    set((s) => {
      const newTransform: DisplayTransform = {
        id: crypto.randomUUID(),
        name: "New Transform",
        pattern: "",
        replacement: "",
        flags: "g",
        order: s.worldDraft.displayTransforms.length,
        enabled: true,
      };
      const draft = {
        ...s.worldDraft,
        displayTransforms: [...s.worldDraft.displayTransforms, newTransform],
      };
      return commitDraft(s, draft);
    });
  },

  updateDisplayTransform: (id, updates) => {
    set((s) => {
      const draft = {
        ...s.worldDraft,
        displayTransforms: s.worldDraft.displayTransforms.map((t) =>
          t.id === id ? { ...t, ...updates } : t
        ),
      };
      return commitDraft(s, draft);
    });
  },

  removeDisplayTransform: (id) => {
    set((s) => {
      const draft = {
        ...s.worldDraft,
        displayTransforms: s.worldDraft.displayTransforms.filter((t) => t.id !== id),
      };
      return commitDraft(s, draft);
    });
  },

  addRule: () => {
    set((s) => {
      const newRule: Rule = {
        id: crypto.randomUUID(),
        name: "New Rule",
        description: "",
        conditions: [],
        conditionLogic: "all",
        effects: [],
        priority: s.worldDraft.rules.length,
      };
      const draft = {
        ...s.worldDraft,
        rules: [...s.worldDraft.rules, newRule],
      };
      return commitDraft(s, draft);
    });
  },

  updateRule: (id, updates) => {
    set((s) => {
      const draft = {
        ...s.worldDraft,
        rules: s.worldDraft.rules.map((r) =>
          r.id === id ? { ...r, ...updates } : r
        ),
      };
      return commitDraft(s, draft);
    });
  },

  removeRule: (id) => {
    set((s) => {
      const draft = {
        ...s.worldDraft,
        rules: s.worldDraft.rules.filter((r) => r.id !== id),
      };
      return commitDraft(s, draft);
    });
  },

  reorderRules: (ruleIds) => {
    set((s) => {
      const ruleMap = new Map(s.worldDraft.rules.map((r) => [r.id, r]));
      const reordered = ruleIds
        .map((id, i) => {
          const rule = ruleMap.get(id);
          return rule ? { ...rule, priority: i } : null;
        })
        .filter(Boolean) as Rule[];
      const draft = { ...s.worldDraft, rules: reordered };
      return commitDraft(s, draft);
    });
  },

  loadTemplate: (template) => {
    const draft = template.build();
    set({
      worldDraft: draft,
      serverWorldId: null,
      isDirty: true,
      activeSection: "entries",
      _past: [],
      _future: [],
      canUndo: false,
      canRedo: false,
    });
    localStorage.removeItem(DRAFT_KEY);
  },

  loadWorldDefinition: (def) => {
    set({
      worldDraft: def,
      serverWorldId: null,
      isDirty: true,
      activeSection: "entries",
      _past: [],
      _future: [],
      canUndo: false,
      canRedo: false,
    });
    localStorage.removeItem(DRAFT_KEY);
  },

  saveDraft: async () => {
    const { worldDraft, serverWorldId } = get();
    set({ saving: true });

    try {
      const payload = {
        name: worldDraft.name || "Untitled World",
        description: worldDraft.description,
        schema: worldDraft as unknown as Record<string, unknown>,
      };

      if (serverWorldId) {
        const res = await fetch(`${apiBase}/api/worlds/${serverWorldId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          set({ isDirty: false });
          localStorage.removeItem(DRAFT_KEY);
          toast.success("Saved!");
        } else {
          toast.error("Failed to save");
        }
      } else {
        const res = await fetch(`${apiBase}/api/worlds`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const { data } = await res.json();
          set({ serverWorldId: data.id, isDirty: false });
          localStorage.removeItem(DRAFT_KEY);
          toast.success("Saved!");
        } else {
          toast.error("Failed to save");
        }
      }
    } catch {
      toast.error("Failed to save");
    } finally {
      set({ saving: false });
    }
  },

  loadDraftFromStorage: () => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const { draft, serverId } = JSON.parse(raw);
      if (draft) {
        // Migrate draft if it's in v1 format
        const migrated = migrateWorldDefinition(draft);
        set({
          worldDraft: migrated,
          serverWorldId: serverId ?? null,
          isDirty: true,
          _past: [],
          _future: [],
          canUndo: false,
          canRedo: false,
        });
      }
    } catch {
      // ignore corrupted storage
    }
  },

  clearDraft: () => {
    localStorage.removeItem(DRAFT_KEY);
    set({ isDirty: false });
  },
}));
