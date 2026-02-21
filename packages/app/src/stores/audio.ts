import { create } from "zustand";
import type { AudioTrack, AudioEffect } from "@yumina/engine";

interface ActiveTrack {
  audio: HTMLAudioElement;
  volume: number;
  type: "bgm" | "sfx" | "ambient";
}

interface AudioState {
  tracks: AudioTrack[];
  activeTracks: Map<string, ActiveTrack>;
  masterVolume: number;
  muted: boolean;

  // Actions
  setTracks: (tracks: AudioTrack[]) => void;
  processAudioEffects: (effects: AudioEffect[]) => void;
  playTrack: (id: string, opts?: { volume?: number; fadeDuration?: number }) => void;
  stopTrack: (id: string, fadeDuration?: number) => void;
  stopAll: () => void;
  setMasterVolume: (volume: number) => void;
  toggleMute: () => void;
  resumeFromState: (activeAudio: unknown) => void;
  cleanup: () => void;
}

const FADE_INTERVAL = 50; // ms between fade steps

export const useAudioStore = create<AudioState>((set, get) => ({
  tracks: [],
  activeTracks: new Map(),
  masterVolume: 0.7,
  muted: false,

  setTracks: (tracks) => set({ tracks }),

  processAudioEffects: (effects) => {
    const state = get();
    for (const effect of effects) {
      switch (effect.action) {
        case "play":
          state.playTrack(effect.trackId, {
            volume: effect.volume,
            fadeDuration: effect.fadeDuration,
          });
          break;
        case "stop":
          state.stopTrack(effect.trackId, effect.fadeDuration);
          break;
        case "volume": {
          const active = state.activeTracks.get(effect.trackId);
          if (active && effect.volume !== undefined) {
            active.volume = effect.volume;
            active.audio.volume = effect.volume * state.masterVolume * (state.muted ? 0 : 1);
            set({ activeTracks: new Map(state.activeTracks) });
          }
          break;
        }
        case "crossfade":
          // Stop all current BGM tracks, then play the new one
          for (const [id, track] of state.activeTracks) {
            if (track.type === "bgm") {
              state.stopTrack(id, effect.fadeDuration ?? 1);
            }
          }
          state.playTrack(effect.trackId, {
            volume: effect.volume,
            fadeDuration: effect.fadeDuration ?? 1,
          });
          break;
      }
    }
  },

  playTrack: async (id, opts) => {
    const state = get();
    const track = state.tracks.find((t) => t.id === id);
    if (!track) return;

    // Stop existing instance of same track
    const existing = state.activeTracks.get(id);
    if (existing) {
      existing.audio.pause();
      existing.audio.src = "";
    }

    // Resolve @asset: references to presigned URLs
    let url = track.url;
    if (url.startsWith("@asset:")) {
      try {
        const { resolveAssetUrl } = await import("@/lib/asset-url");
        url = await resolveAssetUrl(url);
      } catch { /* use raw url */ }
    }

    const audio = new Audio(url);
    const targetVolume = opts?.volume ?? track.volume ?? 1;
    const fadeDuration = opts?.fadeDuration ?? track.fadeIn ?? 0;
    const shouldLoop = track.loop ?? (track.type === "bgm" || track.type === "ambient");

    audio.loop = shouldLoop;

    // Handle autoplay restrictions gracefully
    audio.addEventListener("error", () => {
      state.activeTracks.delete(id);
      set({ activeTracks: new Map(state.activeTracks) });
    });

    if (fadeDuration > 0) {
      audio.volume = 0;
      audio.play().catch(() => { /* autoplay blocked */ });

      const steps = Math.ceil((fadeDuration * 1000) / FADE_INTERVAL);
      const volumeStep = targetVolume / steps;
      let currentStep = 0;

      const fadeTimer = setInterval(() => {
        currentStep++;
        const vol = Math.min(targetVolume, volumeStep * currentStep);
        audio.volume = vol * state.masterVolume * (state.muted ? 0 : 1);
        if (currentStep >= steps) {
          clearInterval(fadeTimer);
        }
      }, FADE_INTERVAL);
    } else {
      audio.volume = targetVolume * state.masterVolume * (state.muted ? 0 : 1);
      audio.play().catch(() => { /* autoplay blocked */ });
    }

    const newMap = new Map(state.activeTracks);
    newMap.set(id, { audio, volume: targetVolume, type: track.type });
    set({ activeTracks: newMap });
  },

  stopTrack: (id, fadeDuration) => {
    const state = get();
    const active = state.activeTracks.get(id);
    if (!active) return;

    const track = state.tracks.find((t) => t.id === id);
    const fade = fadeDuration ?? track?.fadeOut ?? 0;

    if (fade > 0) {
      const startVolume = active.audio.volume;
      const steps = Math.ceil((fade * 1000) / FADE_INTERVAL);
      const volumeStep = startVolume / steps;
      let currentStep = 0;

      const fadeTimer = setInterval(() => {
        currentStep++;
        const vol = Math.max(0, startVolume - volumeStep * currentStep);
        active.audio.volume = vol;
        if (currentStep >= steps) {
          clearInterval(fadeTimer);
          active.audio.pause();
          active.audio.src = "";
          const newMap = new Map(get().activeTracks);
          newMap.delete(id);
          set({ activeTracks: newMap });
        }
      }, FADE_INTERVAL);
    } else {
      active.audio.pause();
      active.audio.src = "";
      const newMap = new Map(state.activeTracks);
      newMap.delete(id);
      set({ activeTracks: newMap });
    }
  },

  stopAll: () => {
    const state = get();
    for (const [, active] of state.activeTracks) {
      active.audio.pause();
      active.audio.src = "";
    }
    set({ activeTracks: new Map() });
  },

  setMasterVolume: (volume) => {
    const state = get();
    set({ masterVolume: volume });
    for (const [, active] of state.activeTracks) {
      active.audio.volume = active.volume * volume * (state.muted ? 0 : 1);
    }
  },

  toggleMute: () => {
    const state = get();
    const newMuted = !state.muted;
    set({ muted: newMuted });
    for (const [, active] of state.activeTracks) {
      active.audio.volume = newMuted ? 0 : active.volume * state.masterVolume;
    }
  },

  resumeFromState: (activeAudio) => {
    if (!activeAudio || !Array.isArray(activeAudio)) return;
    const state = get();
    // Resume play effects from persisted state
    for (const effect of activeAudio as AudioEffect[]) {
      if (effect.action === "play") {
        state.playTrack(effect.trackId, { volume: effect.volume });
      }
    }
  },

  cleanup: () => {
    get().stopAll();
    set({ tracks: [], activeTracks: new Map() });
  },
}));
