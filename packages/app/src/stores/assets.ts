import { create } from "zustand";
import { toast } from "sonner";

export interface Asset {
  id: string;
  worldId: string;
  type: "image" | "audio" | "font" | "other";
  filename: string;
  url: string; // presigned GET URL
  mimeType: string | null;
  sizeBytes: number | null;
  createdAt: string;
}

interface AssetState {
  assets: Asset[];
  loading: boolean;
  uploading: boolean;
  storage: { used: number; limit: number };

  fetchAssets: (worldId: string) => Promise<void>;
  uploadAsset: (
    worldId: string,
    file: File,
    type: "image" | "audio" | "font" | "other"
  ) => Promise<Asset | null>;
  deleteAsset: (worldId: string, assetId: string) => Promise<void>;
  clear: () => void;
}

const apiBase = import.meta.env.VITE_API_URL || "";

export const useAssetStore = create<AssetState>((set, get) => ({
  assets: [],
  loading: false,
  uploading: false,
  storage: { used: 0, limit: 100 * 1024 * 1024 },

  fetchAssets: async (worldId) => {
    set({ loading: true });
    try {
      const res = await fetch(`${apiBase}/api/worlds/${worldId}/assets`, {
        credentials: "include",
      });
      if (!res.ok) {
        set({ loading: false });
        return;
      }
      const { data, storage } = await res.json();
      set({ assets: data ?? [], storage: storage ?? get().storage, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  uploadAsset: async (worldId, file, type) => {
    set({ uploading: true });

    try {
      // 1. Get presigned upload URL
      const urlRes = await fetch(`${apiBase}/api/worlds/${worldId}/assets/upload-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          type,
        }),
      });

      if (!urlRes.ok) {
        const err = await urlRes.json().catch(() => ({ error: "Failed to get upload URL" }));
        toast.error((err as { error: string }).error);
        set({ uploading: false });
        return null;
      }

      const { data: urlData } = await urlRes.json();

      // Check file size against server-provided limit
      if (file.size > urlData.maxSize) {
        toast.error(`File too large (max ${Math.round(urlData.maxSize / 1024 / 1024)}MB)`);
        set({ uploading: false });
        return null;
      }

      // 2. Upload directly to S3 via presigned PUT URL
      const uploadRes = await fetch(urlData.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!uploadRes.ok) {
        toast.error("Upload to storage failed");
        set({ uploading: false });
        return null;
      }

      // 3. Register asset in DB
      const regRes = await fetch(`${apiBase}/api/worlds/${worldId}/assets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          key: urlData.key,
          filename: file.name,
          type,
          mimeType: file.type,
          sizeBytes: file.size,
        }),
      });

      if (!regRes.ok) {
        toast.error("Failed to register asset");
        set({ uploading: false });
        return null;
      }

      const { data: asset } = await regRes.json();

      // 4. Add to local state
      set((s) => ({
        assets: [...s.assets, asset],
        storage: { ...s.storage, used: s.storage.used + (file.size ?? 0) },
        uploading: false,
      }));

      toast.success(`Uploaded "${file.name}"`);
      return asset;
    } catch {
      toast.error("Upload failed");
      set({ uploading: false });
      return null;
    }
  },

  deleteAsset: async (worldId, assetId) => {
    try {
      const res = await fetch(`${apiBase}/api/worlds/${worldId}/assets/${assetId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        toast.error("Failed to delete asset");
        return;
      }
      set((s) => {
        const deleted = s.assets.find((a) => a.id === assetId);
        return {
          assets: s.assets.filter((a) => a.id !== assetId),
          storage: {
            ...s.storage,
            used: Math.max(0, s.storage.used - (deleted?.sizeBytes ?? 0)),
          },
        };
      });
      toast.success("Asset deleted");
    } catch {
      toast.error("Failed to delete asset");
    }
  },

  clear: () => set({ assets: [], loading: false, uploading: false, storage: { used: 0, limit: 100 * 1024 * 1024 } }),
}));
