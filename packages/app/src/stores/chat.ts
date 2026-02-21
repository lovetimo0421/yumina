import { create } from "zustand";
import { connectSSE } from "@/lib/sse";
import { useAudioStore } from "./audio";

export interface Message {
  id: string;
  sessionId: string;
  role: "user" | "assistant" | "system";
  content: string;
  stateChanges?: Record<string, unknown> | null;
  swipes?: Array<{
    content: string;
    stateChanges?: Record<string, unknown>;
    createdAt: string;
    model?: string;
    tokenCount?: number;
  }>;
  activeSwipeIndex?: number;
  model?: string | null;
  tokenCount?: number | null;
  generationTimeMs?: number | null;
  compacted?: boolean;
  createdAt: string;
}

export interface SessionData {
  id: string;
  worldId: string;
  state: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  world?: {
    id: string;
    name: string;
    description: string;
    schema: Record<string, unknown>;
  } | null;
}

export interface StateChange {
  variableId: string;
  oldValue: number | string | boolean;
  newValue: number | string | boolean;
}

interface ChatState {
  // Current session
  session: SessionData | null;
  messages: Message[];
  gameState: Record<string, number | string | boolean>;

  // Streaming state
  isStreaming: boolean;
  streamingContent: string;
  streamStartTime: number | null;
  abortController: AbortController | null;

  // Recent state changes for notifications
  recentStateChanges: StateChange[];

  // AI-provided choices
  pendingChoices: string[];

  // Model selection
  selectedModel: string;

  // Actions
  setSession: (session: SessionData | null) => void;
  setSelectedModel: (model: string) => void;
  setMessages: (messages: Message[]) => void;
  setGameState: (state: Record<string, number | string | boolean>) => void;
  addMessage: (message: Message) => void;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  removeMessage: (id: string) => void;
  sendMessage: (content: string, model?: string) => void;
  regenerateMessage: (messageId: string, model?: string) => void;
  stopGeneration: () => void;
  addRecentStateChange: (change: StateChange) => void;
  clearRecentStateChanges: () => void;
  setPendingChoices: (choices: string[]) => void;
  clearPendingChoices: () => void;

  // Direct variable update (from custom components)
  setVariableDirectly: (id: string, value: number | string | boolean) => void;

  // Load session data from API
  loadSession: (sessionId: string) => Promise<void>;
}

const apiBase = import.meta.env.VITE_API_URL || "";

export const useChatStore = create<ChatState>((set, get) => ({
  session: null,
  messages: [],
  gameState: {},
  isStreaming: false,
  streamingContent: "",
  streamStartTime: null,
  abortController: null,
  recentStateChanges: [],
  pendingChoices: [],
  selectedModel: "anthropic/claude-sonnet-4",

  setSession: (session) => set({ session }),
  setSelectedModel: (model) => set({ selectedModel: model }),
  setMessages: (messages) => set({ messages }),
  setGameState: (gameState) => set({ gameState }),

  addMessage: (message) =>
    set((s) => ({ messages: [...s.messages, message] })),

  updateMessage: (id, updates) =>
    set((s) => ({
      messages: s.messages.map((m) =>
        m.id === id ? { ...m, ...updates } : m
      ),
    })),

  removeMessage: (id) =>
    set((s) => ({
      messages: s.messages.filter((m) => m.id !== id),
    })),

  loadSession: async (sessionId: string) => {
    try {
      // Stop any existing audio when switching sessions
      useAudioStore.getState().cleanup();

      const res = await fetch(`${apiBase}/api/sessions/${sessionId}`, {
        credentials: "include",
      });
      if (!res.ok) return;

      const { data } = await res.json();
      const gameState = (data.state?.variables ?? {}) as Record<
        string,
        number | string | boolean
      >;

      set({
        session: data,
        messages: data.messages ?? [],
        gameState,
      });

      // Load audio tracks from world definition
      const worldDef = data.world?.schema as Record<string, unknown> | undefined;
      if (worldDef?.audioTracks && Array.isArray(worldDef.audioTracks)) {
        const audioStore = useAudioStore.getState();
        audioStore.setTracks(worldDef.audioTracks as import("@yumina/engine").AudioTrack[]);

        // Resume audio from persisted state
        const metadata = data.state?.metadata as Record<string, unknown> | undefined;
        if (metadata?.activeAudio) {
          audioStore.resumeFromState(metadata.activeAudio);
        }
      }
    } catch {
      // Silently fail — the UI will show empty state
    }
  },

  sendMessage: (content: string, model?: string) => {
    const { session, isStreaming, selectedModel } = get();
    if (!session || isStreaming) return;
    const useModel = model ?? selectedModel;

    set({
      isStreaming: true,
      streamingContent: "",
      streamStartTime: Date.now(),
      pendingChoices: [],
    });

    const controller = connectSSE(
      `${apiBase}/api/sessions/${session.id}/messages`,
      {
        method: "POST",
        body: { content, model: useModel },
        callbacks: {
          onText: (text) => {
            set((s) => ({ streamingContent: s.streamingContent + text }));
          },
          onDone: (data) => {
            const state = get();
            // Add user message
            if (data.userMessageId) {
              set((s) => ({
                messages: [
                  ...s.messages,
                  {
                    id: data.userMessageId as string,
                    sessionId: session.id,
                    role: "user" as const,
                    content,
                    createdAt: new Date().toISOString(),
                  },
                ],
              }));
            }

            // Add assistant message
            const assistantMsg: Message = {
              id: (data.messageId as string) ?? crypto.randomUUID(),
              sessionId: session.id,
              role: "assistant",
              content: state.streamingContent,
              stateChanges: data.stateChanges as Record<string, unknown> | null,
              model: (data.model as string) ?? null,
              tokenCount: (data.tokenCount as number) ?? null,
              generationTimeMs: (data.generationTimeMs as number) ?? null,
              createdAt: new Date().toISOString(),
            };

            // Update game state
            const newGameState = (
              (data.state as Record<string, unknown>)
                ?.variables as Record<string, number | string | boolean>
            ) ?? state.gameState;

            // Process state changes for notifications
            const changes = data.stateChanges as StateChange[] | undefined;
            if (changes && Array.isArray(changes)) {
              for (const change of changes) {
                get().addRecentStateChange(change);
              }
            }

            // Extract AI-provided choices
            const choices = data.choices as string[] | undefined;
            if (choices && Array.isArray(choices) && choices.length > 0) {
              get().setPendingChoices(choices);
            }

            // Process audio effects
            const audioEffects = data.audioEffects as import("@yumina/engine").AudioEffect[] | undefined;
            if (audioEffects && Array.isArray(audioEffects) && audioEffects.length > 0) {
              useAudioStore.getState().processAudioEffects(audioEffects);
            }

            set((s) => ({
              messages: [...s.messages, assistantMsg],
              isStreaming: false,
              streamingContent: "",
              streamStartTime: null,
              abortController: null,
              gameState: newGameState,
            }));
          },
          onError: (error) => {
            console.error("SSE error:", error);
            set({
              isStreaming: false,
              streamingContent: "",
              streamStartTime: null,
              abortController: null,
            });
          },
        },
      }
    );

    set({ abortController: controller });
  },

  regenerateMessage: (messageId: string, model?: string) => {
    const { session, isStreaming } = get();
    if (!session || isStreaming) return;

    set({
      isStreaming: true,
      streamingContent: "",
      streamStartTime: Date.now(),
    });

    const controller = connectSSE(
      `${apiBase}/api/messages/${messageId}/regenerate`,
      {
        method: "POST",
        body: { model },
        callbacks: {
          onText: (text) => {
            set((s) => ({ streamingContent: s.streamingContent + text }));
          },
          onDone: (data) => {
            const state = get();

            set((s) => ({
              messages: s.messages.map((m) =>
                m.id === messageId
                  ? {
                      ...m,
                      content: state.streamingContent,
                      stateChanges: data.stateChanges as Record<
                        string,
                        unknown
                      > | null,
                      activeSwipeIndex: data.swipeIndex as number,
                    }
                  : m
              ),
              isStreaming: false,
              streamingContent: "",
              streamStartTime: null,
              abortController: null,
              gameState:
                ((data.state as Record<string, unknown>)
                  ?.variables as Record<string, number | string | boolean>) ??
                state.gameState,
            }));

            const changes = data.stateChanges as StateChange[] | undefined;
            if (changes && Array.isArray(changes)) {
              for (const change of changes) {
                get().addRecentStateChange(change);
              }
            }

            const choices = data.choices as string[] | undefined;
            if (choices && Array.isArray(choices) && choices.length > 0) {
              get().setPendingChoices(choices);
            }

            // Process audio effects
            const regenAudioEffects = data.audioEffects as import("@yumina/engine").AudioEffect[] | undefined;
            if (regenAudioEffects && Array.isArray(regenAudioEffects) && regenAudioEffects.length > 0) {
              useAudioStore.getState().processAudioEffects(regenAudioEffects);
            }
          },
          onError: (error) => {
            console.error("Regeneration error:", error);
            set({
              isStreaming: false,
              streamingContent: "",
              streamStartTime: null,
              abortController: null,
            });
          },
        },
      }
    );

    set({ abortController: controller });
  },

  stopGeneration: () => {
    const { abortController } = get();
    if (abortController) {
      abortController.abort();
      set({
        isStreaming: false,
        streamingContent: "",
        streamStartTime: null,
        abortController: null,
      });
    }
  },

  addRecentStateChange: (change) =>
    set((s) => ({
      recentStateChanges: [...s.recentStateChanges, change],
    })),

  clearRecentStateChanges: () => set({ recentStateChanges: [] }),

  setPendingChoices: (choices) => set({ pendingChoices: choices }),
  clearPendingChoices: () => set({ pendingChoices: [] }),

  setVariableDirectly: (id, value) => {
    const oldValue = get().gameState[id] ?? value;
    set((s) => ({
      gameState: { ...s.gameState, [id]: value },
      recentStateChanges: [
        ...s.recentStateChanges,
        { variableId: id, oldValue, newValue: value },
      ],
    }));
    // Persist to server (fire-and-forget)
    const sessionId = get().session?.id;
    if (sessionId) {
      const newState = get().gameState;
      fetch(`${apiBase}/api/sessions/${sessionId}/state`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ state: { variables: newState } }),
      }).catch(() => {});
    }
  },
}));
