import { useEffect, useState, useRef, useCallback } from "react";
import {
  Upload,
  Trash2,
  Image as ImageIcon,
  Music,
  Type,
  File,
  Copy,
  Loader2,
  Play,
  Pause,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAssetStore, type Asset } from "@/stores/assets";
import { useEditorStore } from "@/stores/editor";
import { toast } from "sonner";

const TYPE_TABS = [
  { id: "all", label: "All" },
  { id: "image", label: "Images" },
  { id: "audio", label: "Audio" },
  { id: "font", label: "Fonts" },
] as const;

const TYPE_ICONS: Record<string, typeof ImageIcon> = {
  image: ImageIcon,
  audio: Music,
  font: Type,
  other: File,
};

function detectAssetType(mimeType: string): "image" | "audio" | "font" | "other" {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType.startsWith("font/") || mimeType.includes("font")) return "font";
  return "other";
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AssetsSection() {
  const { serverWorldId } = useEditorStore();
  const {
    assets,
    loading,
    uploading,
    storage,
    fetchAssets,
    uploadAsset,
    deleteAsset,
  } = useAssetStore();

  const [activeTab, setActiveTab] = useState<string>("all");
  const [selected, setSelected] = useState<Asset | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [audioPlaying, setAudioPlaying] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (serverWorldId) {
      fetchAssets(serverWorldId);
    }
  }, [serverWorldId, fetchAssets]);

  const filtered = activeTab === "all"
    ? assets
    : assets.filter((a) => a.type === activeTab);

  const handleUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !serverWorldId) return;
      e.target.value = "";

      const type = detectAssetType(file.type);
      await uploadAsset(serverWorldId, file, type);
    },
    [serverWorldId, uploadAsset]
  );

  const handleDelete = useCallback(
    async (assetId: string) => {
      if (!serverWorldId) return;
      setConfirmDelete(null);
      if (selected?.id === assetId) setSelected(null);
      await deleteAsset(serverWorldId, assetId);
    },
    [serverWorldId, deleteAsset, selected]
  );

  const handleCopyRef = useCallback((assetId: string) => {
    navigator.clipboard.writeText(`@asset:${assetId}`);
    toast.success("Copied asset reference");
  }, []);

  const toggleAudio = useCallback((url: string, assetId: string) => {
    if (audioPlaying === assetId) {
      audioRef.current?.pause();
      setAudioPlaying(null);
    } else {
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.play().catch(() => {});
      }
      setAudioPlaying(assetId);
    }
  }, [audioPlaying]);

  if (!serverWorldId) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-muted-foreground/50">
          Save the world first to manage assets.
        </p>
      </div>
    );
  }

  const usagePercent = storage.limit > 0
    ? Math.min(100, (storage.used / storage.limit) * 100)
    : 0;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="shrink-0 border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Assets</h2>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {uploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
            Upload
          </button>
        </div>

        {/* Storage bar */}
        <div className="mt-2">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground/50">
            <span>{formatBytes(storage.used)} used</span>
            <span>{formatBytes(storage.limit)} limit</span>
          </div>
          <div className="mt-0.5 h-1 rounded-full bg-border">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                usagePercent > 90 ? "bg-destructive" : "bg-primary"
              )}
              style={{ width: `${usagePercent}%` }}
            />
          </div>
        </div>

        {/* Type tabs */}
        <div className="mt-3 flex gap-1">
          {TYPE_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                activeTab === tab.id
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground/50 hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,audio/*,font/*,.woff,.woff2,.ttf,.otf"
        className="hidden"
        onChange={handleUpload}
      />

      {/* Hidden audio element for preview */}
      <audio ref={audioRef} onEnded={() => setAudioPlaying(null)} />

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/40" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <p className="text-sm text-muted-foreground/40">
              {assets.length === 0
                ? "No assets yet. Upload images, audio, or fonts."
                : "No assets match this filter."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {filtered.map((asset) => {
              const Icon = TYPE_ICONS[asset.type] ?? File;
              const isSelected = selected?.id === asset.id;

              return (
                <button
                  key={asset.id}
                  onClick={() => setSelected(isSelected ? null : asset)}
                  className={cn(
                    "group relative flex flex-col overflow-hidden rounded-lg border text-left transition-colors",
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/30"
                  )}
                >
                  {/* Preview area */}
                  <div className="flex h-24 items-center justify-center bg-accent/30">
                    {asset.type === "image" ? (
                      <img
                        src={asset.url}
                        alt={asset.filename}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <Icon className="h-8 w-8 text-muted-foreground/20" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-2">
                    <p className="truncate text-xs font-medium text-foreground">
                      {asset.filename}
                    </p>
                    <p className="text-[10px] text-muted-foreground/40">
                      {formatBytes(asset.sizeBytes ?? 0)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Selected asset detail panel */}
      {selected && (
        <div className="shrink-0 border-t border-border p-4">
          <div className="flex items-start gap-3">
            {/* Preview */}
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-accent/50 overflow-hidden">
              {selected.type === "image" ? (
                <img src={selected.url} alt="" className="h-full w-full object-cover" />
              ) : (
                (() => { const I = TYPE_ICONS[selected.type] ?? File; return <I className="h-6 w-6 text-muted-foreground/30" />; })()
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {selected.filename}
              </p>
              <p className="text-xs text-muted-foreground/50">
                {selected.type} &middot; {formatBytes(selected.sizeBytes ?? 0)}
                {selected.mimeType ? ` &middot; ${selected.mimeType}` : ""}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-3 flex gap-2">
            {selected.type === "audio" && (
              <button
                onClick={() => toggleAudio(selected.url, selected.id)}
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
              >
                {audioPlaying === selected.id ? (
                  <Pause className="h-3.5 w-3.5" />
                ) : (
                  <Play className="h-3.5 w-3.5" />
                )}
                {audioPlaying === selected.id ? "Pause" : "Play"}
              </button>
            )}

            <button
              onClick={() => handleCopyRef(selected.id)}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
            >
              <Copy className="h-3.5 w-3.5" />
              Copy Ref
            </button>

            {confirmDelete === selected.id ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleDelete(selected.id)}
                  className="rounded-lg bg-destructive/15 px-3 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/25"
                >
                  Confirm
                </button>
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="rounded-lg px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(selected.id)}
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-destructive/70 transition-colors hover:bg-destructive/5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
