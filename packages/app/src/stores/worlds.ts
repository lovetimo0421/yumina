import { create } from "zustand";
import { toast } from "sonner";

export interface WorldItem {
  id: string;
  creatorId: string;
  name: string;
  description: string | null;
  schema: Record<string, unknown>;
  thumbnailUrl: string | null;
  isPublished: boolean | null;
  downloadCount: number;
  sourceWorldId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface WorldsState {
  worlds: WorldItem[];
  loading: boolean;
  error: string | null;
  fetchWorlds: () => Promise<void>;
}

const apiBase = import.meta.env.VITE_API_URL || "";

export const useWorldsStore = create<WorldsState>((set) => ({
  worlds: [],
  loading: false,
  error: null,

  fetchWorlds: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${apiBase}/api/worlds`, {
        credentials: "include",
      });
      if (!res.ok) {
        toast.error("Failed to load worlds");
        set({ error: "Failed to fetch worlds", loading: false });
        return;
      }
      const { data } = await res.json();
      set({ worlds: data, loading: false });
    } catch {
      toast.error("Failed to load worlds");
      set({ error: "Network error", loading: false });
    }
  },
}));
