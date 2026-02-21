import { useState, useRef } from "react";
import { Plus, Trash2, Music, Play, Square, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/stores/editor";
import { AssetPicker } from "../asset-picker";
import type { AudioTrack } from "@yumina/engine";

const TRACK_TYPES: { value: AudioTrack["type"]; label: string; color: string }[] = [
  { value: "bgm", label: "BGM", color: "bg-violet-500/15 text-violet-400" },
  { value: "sfx", label: "SFX", color: "bg-amber-500/15 text-amber-400" },
  { value: "ambient", label: "Ambient", color: "bg-teal-500/15 text-teal-400" },
];

export function AudioSection() {
  const { worldDraft, serverWorldId, addAudioTrack, updateAudioTrack, removeAudioTrack } =
    useEditorStore();
  const audioTracks = worldDraft.audioTracks ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(
    audioTracks[0]?.id ?? null
  );
  const previewRef = useRef<HTMLAudioElement | null>(null);
  const [previewing, setPreviewing] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  const selected = audioTracks.find((t) => t.id === selectedId);

  function togglePreview(url: string, trackId: string) {
    if (previewing === trackId) {
      previewRef.current?.pause();
      setPreviewing(null);
      return;
    }
    if (previewRef.current) {
      previewRef.current.pause();
    }
    const audio = new Audio(url);
    audio.volume = 0.5;
    audio.addEventListener("ended", () => setPreviewing(null));
    audio.play().catch(() => { /* blocked */ });
    previewRef.current = audio;
    setPreviewing(trackId);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Audio</h2>
          <p className="mt-1 text-sm text-muted-foreground/50">
            Add background music, sound effects, and ambient sounds
          </p>
        </div>
        <button
          onClick={() => {
            addAudioTrack();
            const tracks = useEditorStore.getState().worldDraft.audioTracks ?? [];
            setSelectedId(tracks[tracks.length - 1]?.id ?? null);
          }}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Track
        </button>
      </div>

      {audioTracks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-12 text-center">
          <Music className="mx-auto h-8 w-8 text-muted-foreground/20" />
          <p className="mt-2 text-sm text-muted-foreground/40">
            No audio tracks. Add background music, sound effects, or ambient sounds.
          </p>
        </div>
      ) : (
        <div className="flex gap-4">
          {/* Track list */}
          <div className="w-48 shrink-0 space-y-1">
            {audioTracks.map((track) => {
              const typeInfo = TRACK_TYPES.find((t) => t.value === track.type);
              return (
                <button
                  key={track.id}
                  onClick={() => setSelectedId(track.id)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                    selectedId === track.id
                      ? "active-surface text-foreground"
                      : "text-muted-foreground hover-surface"
                  )}
                >
                  <span className="flex-1 truncate">{track.name || "Unnamed"}</span>
                  <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${typeInfo?.color ?? ""}`}>
                    {typeInfo?.label ?? track.type}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Track form */}
          {selected && (
            <div className="flex-1 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-foreground">Edit Track</h3>
                <button
                  onClick={() => {
                    removeAudioTrack(selected.id);
                    const tracks = useEditorStore.getState().worldDraft.audioTracks ?? [];
                    setSelectedId(tracks[0]?.id ?? null);
                  }}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-3 w-3" />
                  Delete
                </button>
              </div>

              {/* Name */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Name</label>
                <input
                  type="text"
                  value={selected.name}
                  onChange={(e) => updateAudioTrack(selected.id, { name: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {/* Type */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">Type</label>
                <div className="flex gap-2">
                  {TRACK_TYPES.map((tt) => (
                    <button
                      key={tt.value}
                      onClick={() => updateAudioTrack(selected.id, { type: tt.value })}
                      className={cn(
                        "rounded-lg px-3 py-1.5 text-sm transition-colors",
                        selected.type === tt.value
                          ? "bg-primary text-primary-foreground"
                          : "bg-accent text-muted-foreground"
                      )}
                    >
                      {tt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* URL */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">URL</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={selected.url}
                    onChange={(e) => updateAudioTrack(selected.id, { url: e.target.value })}
                    placeholder="https://example.com/audio.mp3 or @asset:id"
                    className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  {serverWorldId && (
                    <button
                      onClick={() => setShowPicker(true)}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:bg-accent"
                      title="Browse uploaded assets"
                    >
                      <FolderOpen className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {selected.url && (
                    <button
                      onClick={() => togglePreview(selected.url, selected.id)}
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-lg border border-border",
                        previewing === selected.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-background text-muted-foreground hover:bg-accent"
                      )}
                    >
                      {previewing === selected.id ? (
                        <Square className="h-3.5 w-3.5" />
                      ) : (
                        <Play className="h-3.5 w-3.5" />
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Loop */}
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-foreground">Loop</label>
                <button
                  onClick={() => updateAudioTrack(selected.id, { loop: !selected.loop })}
                  className={cn(
                    "h-5 w-9 rounded-full transition-colors",
                    selected.loop ? "bg-primary" : "bg-muted-foreground/20"
                  )}
                >
                  <div
                    className={cn(
                      "h-4 w-4 rounded-full bg-white transition-transform",
                      selected.loop ? "translate-x-4" : "translate-x-0.5"
                    )}
                  />
                </button>
              </div>

              {/* Volume */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  Volume ({Math.round((selected.volume ?? 1) * 100)}%)
                </label>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={selected.volume ?? 1}
                  onChange={(e) => updateAudioTrack(selected.id, { volume: parseFloat(e.target.value) })}
                  className="w-full accent-primary"
                />
              </div>

              {/* Fade In / Out */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Fade In (s)</label>
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={selected.fadeIn ?? 0}
                    onChange={(e) => updateAudioTrack(selected.id, { fadeIn: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="flex-1">
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Fade Out (s)</label>
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={selected.fadeOut ?? 0}
                    onChange={(e) => updateAudioTrack(selected.id, { fadeOut: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      {showPicker && serverWorldId && selected && (
        <AssetPicker
          worldId={serverWorldId}
          filterType="audio"
          onSelect={(ref) => {
            updateAudioTrack(selected.id, { url: ref });
            setShowPicker(false);
          }}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}
