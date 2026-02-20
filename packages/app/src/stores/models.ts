import { create } from "zustand";

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  contextLength: number;
  pricing?: { prompt: number; completion: number };
  isCurated: boolean;
}

interface ModelsState {
  models: ModelInfo[];
  curated: ModelInfo[];
  recentlyUsed: string[];
  loading: boolean;
  lastFetched: number;

  fetchModels: () => Promise<void>;
  search: (query: string) => ModelInfo[];
  addToRecent: (modelId: string) => void;
}

const apiBase = import.meta.env.VITE_API_URL || "";
const RECENT_KEY = "yumina-recent-models";
const CACHE_TTL = 5 * 60 * 1000;

function loadRecent(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export const useModelsStore = create<ModelsState>((set, get) => ({
  models: [],
  curated: [],
  recentlyUsed: loadRecent(),
  loading: false,
  lastFetched: 0,

  fetchModels: async () => {
    const now = Date.now();
    if (get().models.length > 0 && now - get().lastFetched < CACHE_TTL) return;

    set({ loading: true });
    try {
      const res = await fetch(`${apiBase}/api/models`, {
        credentials: "include",
      });
      if (!res.ok) {
        set({ loading: false });
        return;
      }
      const { data } = await res.json();
      set({
        models: data.all ?? [],
        curated: data.curated ?? [],
        loading: false,
        lastFetched: now,
      });
    } catch {
      set({ loading: false });
    }
  },

  search: (query: string) => {
    const q = query.toLowerCase();
    return get().models.filter(
      (m) =>
        m.id.toLowerCase().includes(q) ||
        m.name.toLowerCase().includes(q) ||
        m.provider.toLowerCase().includes(q)
    );
  },

  addToRecent: (modelId: string) => {
    set((s) => {
      const filtered = s.recentlyUsed.filter((id) => id !== modelId);
      const updated = [modelId, ...filtered].slice(0, 10);
      try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return { recentlyUsed: updated };
    });
  },
}));
