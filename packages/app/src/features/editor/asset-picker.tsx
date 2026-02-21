import { useEffect, useRef, useCallback, useState } from "react";
import {
  X,
  Upload,
  Image as ImageIcon,
  Music,
  Type,
  File,
  Loader2,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAssetStore, type Asset } from "@/stores/assets";

interface AssetPickerProps {
  worldId: string;
  filterType?: "image" | "audio" | "font" | "other";
  onSelect: (assetRef: string) => void;
  onClose: () => void;
}

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

export function AssetPicker({ worldId, filterType, onSelect, onClose }: AssetPickerProps) {
  const { assets, loading, uploading, fetchAssets, uploadAsset } = useAssetStore();
  const [search, setSearch] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchAssets(worldId);
  }, [worldId, fetchAssets]);

  const filtered = assets.filter((a) => {
    if (filterType && a.type !== filterType) return false;
    if (search.trim()) {
      return a.filename.toLowerCase().includes(search.toLowerCase());
    }
    return true;
  });

  const handleUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      e.target.value = "";

      const type = filterType ?? detectAssetType(file.type);
      const asset = await uploadAsset(worldId, file, type);
      if (asset) {
        onSelect(`@asset:${asset.id}`);
      }
    },
    [worldId, filterType, uploadAsset, onSelect]
  );

  const handleSelect = useCallback(
    (asset: Asset) => {
      onSelect(`@asset:${asset.id}`);
    },
    [onSelect]
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative mx-4 flex max-h-[70vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold text-foreground">
            {filterType ? `Select ${filterType}` : "Select Asset"}
          </h3>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-muted-foreground/40 transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search + Upload */}
        <div className="flex items-center gap-2 border-b border-border px-4 py-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/30" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md border border-border bg-background py-1.5 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground/30 focus:border-primary/50 focus:outline-none"
            />
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 rounded-md bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20 disabled:opacity-40"
          >
            {uploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}
            Upload
          </button>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={
            filterType === "image" ? "image/*" :
            filterType === "audio" ? "audio/*" :
            filterType === "font" ? ".woff,.woff2,.ttf,.otf" :
            "image/*,audio/*,font/*"
          }
          className="hidden"
          onChange={handleUpload}
        />

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-3">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/40" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground/40">
              {assets.length === 0
                ? "No assets uploaded yet."
                : "No matching assets."}
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {filtered.map((asset) => {
                const Icon = TYPE_ICONS[asset.type] ?? File;
                return (
                  <button
                    key={asset.id}
                    onClick={() => handleSelect(asset)}
                    className={cn(
                      "flex flex-col overflow-hidden rounded-lg border border-border text-left transition-colors",
                      "hover:border-primary/30 hover:bg-primary/5"
                    )}
                  >
                    <div className="flex h-20 items-center justify-center bg-accent/30">
                      {asset.type === "image" ? (
                        <img
                          src={asset.url}
                          alt={asset.filename}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <Icon className="h-6 w-6 text-muted-foreground/20" />
                      )}
                    </div>
                    <p className="truncate px-2 py-1.5 text-[10px] font-medium text-foreground">
                      {asset.filename}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
