import { create } from "zustand";
import type {
  WorldDefinition,
  Variable,
  Character,
  Rule,
} from "@yumina/engine";

const apiBase = import.meta.env.VITE_API_URL || "";

const DRAFT_KEY = "yumina-editor-draft";
const AUTOSAVE_DELAY = 2000;

function createEmptyWorld(): WorldDefinition {
  return {
    id: crypto.randomUUID(),
    version: "1.0.0",
    name: "",
    description: "",
    author: "",
    variables: [],
    rules: [],
    characters: [],
    components: [],
    settings: {
      maxTokens: 2048,
      temperature: 0.8,
      systemPrompt: "",
      greeting: "",
    },
  };
}

export type EditorSection =
  | "overview"
  | "characters"
  | "variables"
  | "rules"
  | "settings"
  | "preview";

interface EditorState {
  worldDraft: WorldDefinition;
  serverWorldId: string | null; // DB world id (null = new world)
  isDirty: boolean;
  activeSection: EditorSection;
  saving: boolean;

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
    value: string | number
  ) => void;

  // Character actions
  addCharacter: () => void;
  updateCharacter: (id: string, updates: Partial<Character>) => void;
  removeCharacter: (id: string) => void;

  // Variable actions
  addVariable: () => void;
  updateVariable: (id: string, updates: Partial<Variable>) => void;
  removeVariable: (id: string) => void;

  // Rule actions
  addRule: () => void;
  updateRule: (id: string, updates: Partial<Rule>) => void;
  removeRule: (id: string) => void;
  reorderRules: (ruleIds: string[]) => void;

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

export const useEditorStore = create<EditorState>((set, get) => ({
  worldDraft: createEmptyWorld(),
  serverWorldId: null,
  isDirty: false,
  activeSection: "overview",
  saving: false,

  createNew: () => {
    const draft = createEmptyWorld();
    set({
      worldDraft: draft,
      serverWorldId: null,
      isDirty: false,
      activeSection: "overview",
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
      // Ensure all fields exist
      const draft: WorldDefinition = {
        id: schema.id || data.id,
        version: schema.version || "1.0.0",
        name: schema.name || data.name || "",
        description: schema.description || data.description || "",
        author: schema.author || "",
        variables: schema.variables || [],
        rules: schema.rules || [],
        characters: schema.characters || [],
        components: schema.components || [],
        settings: {
          maxTokens: schema.settings?.maxTokens ?? 2048,
          temperature: schema.settings?.temperature ?? 0.8,
          systemPrompt: schema.settings?.systemPrompt ?? "",
          greeting: schema.settings?.greeting ?? "",
        },
      };
      set({
        worldDraft: draft,
        serverWorldId: data.id,
        isDirty: false,
        activeSection: "overview",
      });
    } catch {
      // fail silently
    }
  },

  setActiveSection: (section) => set({ activeSection: section }),

  setField: (key, value) => {
    set((s) => {
      const draft = { ...s.worldDraft, [key]: value };
      scheduleDraftSave(draft, s.serverWorldId);
      return { worldDraft: draft, isDirty: true };
    });
  },

  setSettings: (key, value) => {
    set((s) => {
      const draft = {
        ...s.worldDraft,
        settings: { ...s.worldDraft.settings, [key]: value },
      };
      scheduleDraftSave(draft, s.serverWorldId);
      return { worldDraft: draft, isDirty: true };
    });
  },

  addCharacter: () => {
    set((s) => {
      const newChar: Character = {
        id: crypto.randomUUID(),
        name: "New Character",
        description: "",
        systemPrompt: "",
        avatar: "",
        variables: [],
      };
      const draft = {
        ...s.worldDraft,
        characters: [...s.worldDraft.characters, newChar],
      };
      scheduleDraftSave(draft, s.serverWorldId);
      return { worldDraft: draft, isDirty: true };
    });
  },

  updateCharacter: (id, updates) => {
    set((s) => {
      const draft = {
        ...s.worldDraft,
        characters: s.worldDraft.characters.map((c) =>
          c.id === id ? { ...c, ...updates } : c
        ),
      };
      scheduleDraftSave(draft, s.serverWorldId);
      return { worldDraft: draft, isDirty: true };
    });
  },

  removeCharacter: (id) => {
    set((s) => {
      const draft = {
        ...s.worldDraft,
        characters: s.worldDraft.characters.filter((c) => c.id !== id),
      };
      scheduleDraftSave(draft, s.serverWorldId);
      return { worldDraft: draft, isDirty: true };
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
      scheduleDraftSave(draft, s.serverWorldId);
      return { worldDraft: draft, isDirty: true };
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
      scheduleDraftSave(draft, s.serverWorldId);
      return { worldDraft: draft, isDirty: true };
    });
  },

  removeVariable: (id) => {
    set((s) => {
      const draft = {
        ...s.worldDraft,
        variables: s.worldDraft.variables.filter((v) => v.id !== id),
      };
      scheduleDraftSave(draft, s.serverWorldId);
      return { worldDraft: draft, isDirty: true };
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
      scheduleDraftSave(draft, s.serverWorldId);
      return { worldDraft: draft, isDirty: true };
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
      scheduleDraftSave(draft, s.serverWorldId);
      return { worldDraft: draft, isDirty: true };
    });
  },

  removeRule: (id) => {
    set((s) => {
      const draft = {
        ...s.worldDraft,
        rules: s.worldDraft.rules.filter((r) => r.id !== id),
      };
      scheduleDraftSave(draft, s.serverWorldId);
      return { worldDraft: draft, isDirty: true };
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
      scheduleDraftSave(draft, s.serverWorldId);
      return { worldDraft: draft, isDirty: true };
    });
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
        // Update existing
        const res = await fetch(`${apiBase}/api/worlds/${serverWorldId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          set({ isDirty: false });
          localStorage.removeItem(DRAFT_KEY);
        }
      } else {
        // Create new
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
        }
      }
    } catch {
      // fail silently
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
        set({
          worldDraft: draft,
          serverWorldId: serverId ?? null,
          isDirty: true,
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
