import { Volume2, VolumeX, Music } from "lucide-react";
import { useAudioStore } from "@/stores/audio";

export function AudioControls() {
  const { activeTracks, masterVolume, muted, setMasterVolume, toggleMute } =
    useAudioStore();

  // Find current BGM track name
  const currentBgm = [...activeTracks.entries()].find(
    ([, t]) => t.type === "bgm"
  );
  const { tracks } = useAudioStore();
  const bgmTrack = currentBgm
    ? tracks.find((t) => t.id === currentBgm[0])
    : null;

  return (
    <div className="flex items-center gap-2 rounded-lg bg-accent/50 px-3 py-2">
      <Music className="h-3.5 w-3.5 shrink-0 text-primary/60" />

      {bgmTrack ? (
        <span className="flex-1 truncate text-xs text-foreground/70">
          {bgmTrack.name}
        </span>
      ) : (
        <span className="flex-1 text-xs text-muted-foreground/40">
          No audio playing
        </span>
      )}

      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={muted ? 0 : masterVolume}
        onChange={(e) => {
          if (muted) toggleMute();
          setMasterVolume(parseFloat(e.target.value));
        }}
        className="h-1 w-16 cursor-pointer accent-primary"
      />

      <button
        onClick={toggleMute}
        className="hover-surface flex h-6 w-6 items-center justify-center rounded text-muted-foreground/40"
      >
        {muted ? (
          <VolumeX className="h-3.5 w-3.5" />
        ) : (
          <Volume2 className="h-3.5 w-3.5" />
        )}
      </button>
    </div>
  );
}
