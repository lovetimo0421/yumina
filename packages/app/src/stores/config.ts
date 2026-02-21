import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ConfigState {
  maxTokens: number;
  maxContext: number;
  temperature: number;
  streaming: boolean;
  selectedModel: string;

  setConfig: <K extends keyof ConfigValues>(key: K, value: ConfigValues[K]) => void;
  resetDefaults: () => void;
}

type ConfigValues = Pick<ConfigState, "maxTokens" | "maxContext" | "temperature" | "streaming" | "selectedModel">;

const DEFAULTS: ConfigValues = {
  maxTokens: 12000,
  maxContext: 200000,
  temperature: 1.0,
  streaming: true,
  selectedModel: "google/gemini-3.1-pro",
};

export const useConfigStore = create<ConfigState>()(
  persist(
    (set) => ({
      ...DEFAULTS,

      setConfig: (key, value) => set({ [key]: value }),
      resetDefaults: () => set(DEFAULTS),
    }),
    { name: "yumina-global-config" }
  )
);
