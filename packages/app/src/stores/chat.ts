import { create } from "zustand";
import { connectSSE } from "@/lib/sse";
import { useAudioStore } from "./audio";
import { useConfigStore } from "./config";

export interface Attachment {
  type: string;
  mimeType: string;
  name: string;
  data: string; // base64
}

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
  attachments?: Array<{ type: string; mimeType: string; name: string; url: string }> | null;
  createdAt: string;
}

export interface Checkpoint {
  id: string;
  name: string;
  messageCount: number;
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

interface ChatState {
  // Current session
  session: SessionData | null;
  messages: Message[];
  gameState: Record<string, number | string | boolean>;

  // Streaming state
  isStreaming: boolean;
  isContinuing: boolean;
  streamingContent: string;
  streamStartTime: number | null;
  abortController: AbortController | null;

  // AI-provided choices
  pendingChoices: string[];

  // Error state
  error: string | null;

  // Actions
  setSession: (session: SessionData | null) => void;
  clearError: () => void;
  setMessages: (messages: Message[]) => void;
  setGameState: (state: Record<string, number | string | boolean>) => void;
  addMessage: (message: Message) => void;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  removeMessage: (id: string) => void;
  sendMessage: (content: string, model?: string, attachments?: Attachment[]) => void;
  regenerateMessage: (messageId: string, model?: string) => void;
  stopGeneration: () => void;
  setPendingChoices: (choices: string[]) => void;
  clearPendingChoices: () => void;

  // Continue
  continueLastMessage: (model?: string) => void;

  // Revert & restart
  revertLastExchange: () => Promise<void>;
  revertToMessage: (messageId: string) => Promise<void>;
  restartChat: () => Promise<void>;

  // Checkpoints
  checkpoints: Checkpoint[];
  saveCheckpoint: () => Promise<void>;
  loadCheckpoints: () => Promise<void>;
  restoreCheckpoint: (checkpointId: string) => Promise<void>;
  deleteCheckpoint: (checkpointId: string) => Promise<void>;

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
  isContinuing: false,
  streamingContent: "",
  streamStartTime: null,
  abortController: null,
  pendingChoices: [],
  checkpoints: [],
  error: null,

  setSession: (session) => set({ session }),
  clearError: () => set({ error: null }),
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

  sendMessage: (content: string, model?: string, attachments?: Attachment[]) => {
    const { session, isStreaming } = get();
    if (!session || isStreaming) return;
    const config = useConfigStore.getState();
    const useModel = model ?? config.selectedModel;

    // Add user message immediately so it appears in chat before AI responds
    const tempUserMsgId = `__pending_${Date.now()}`;
    set((s) => ({
      isStreaming: true,
      streamingContent: "",
      streamStartTime: Date.now(),
      pendingChoices: [],
      error: null,
      messages: [
        ...s.messages,
        {
          id: tempUserMsgId,
          sessionId: session.id,
          role: "user" as const,
          content,
          createdAt: new Date().toISOString(),
        },
      ],
    }));

    const controller = connectSSE(
      `${apiBase}/api/sessions/${session.id}/messages`,
      {
        method: "POST",
        body: {
          content,
          model: useModel,
          ...(attachments && attachments.length > 0 && { attachments }),
          overrides: {
            maxTokens: config.maxTokens,
            maxContext: config.maxContext,
            temperature: config.temperature,
          },
        },
        callbacks: {
          onText: (text) => {
            set((s) => ({ streamingContent: s.streamingContent + text }));
          },
          onDone: (data) => {
            const state = get();

            // Update temp user message with server-assigned ID
            const serverUserId = data.userMessageId as string | undefined;

            // Build assistant message
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
              messages: [
                // Replace temp user msg ID with server ID, then append assistant
                ...s.messages.map((m) =>
                  m.id === tempUserMsgId && serverUserId
                    ? { ...m, id: serverUserId }
                    : m
                ),
                assistantMsg,
              ],
              isStreaming: false,
              streamingContent: "",
              streamStartTime: null,
              abortController: null,
              gameState: newGameState,
            }));
          },
          onError: (err) => {
            console.error("SSE error:", err);
            // Parse error message from server JSON if possible
            let errorMsg = err;
            try {
              const parsed = JSON.parse(err.replace(/^HTTP \d+: /, ""));
              if (parsed.error) errorMsg = parsed.error;
            } catch { /* use raw */ }
            set({
              isStreaming: false,
              streamingContent: "",
              streamStartTime: null,
              abortController: null,
              error: errorMsg,
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

    const config = useConfigStore.getState();

    set({
      isStreaming: true,
      streamingContent: "",
      streamStartTime: Date.now(),
    });

    const controller = connectSSE(
      `${apiBase}/api/messages/${messageId}/regenerate`,
      {
        method: "POST",
        body: {
          model: model ?? config.selectedModel,
          overrides: {
            maxTokens: config.maxTokens,
            maxContext: config.maxContext,
            temperature: config.temperature,
          },
        },
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
          onError: (err) => {
            console.error("Regeneration error:", err);
            let errorMsg = err;
            try {
              const parsed = JSON.parse(err.replace(/^HTTP \d+: /, ""));
              if (parsed.error) errorMsg = parsed.error;
            } catch { /* use raw */ }
            set({
              isStreaming: false,
              streamingContent: "",
              streamStartTime: null,
              abortController: null,
              error: errorMsg,
            });
          },
        },
      }
    );

    set({ abortController: controller });
  },

  continueLastMessage: (model?: string) => {
    const { session, isStreaming, messages: msgs } = get();
    if (!session || isStreaming) return;

    // Find last assistant message
    let lastAssistantMsg: Message | null = null;
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i]!.role === "assistant") {
        lastAssistantMsg = msgs[i]!;
        break;
      }
    }
    if (!lastAssistantMsg) return;

    const config = useConfigStore.getState();
    const targetId = lastAssistantMsg.id;

    set({
      isStreaming: true,
      isContinuing: true,
      streamingContent: "",
      streamStartTime: Date.now(),
      error: null,
    });

    const controller = connectSSE(
      `${apiBase}/api/sessions/${session.id}/continue`,
      {
        method: "POST",
        body: {
          model: model ?? config.selectedModel,
          overrides: {
            maxTokens: config.maxTokens,
            maxContext: config.maxContext,
            temperature: config.temperature,
          },
        },
        callbacks: {
          onText: (text) => {
            set((s) => ({ streamingContent: s.streamingContent + text }));
          },
          onDone: (data) => {
            const state = get();
            const finalContent = data.content as string;

            set((s) => ({
              messages: s.messages.map((m) =>
                m.id === targetId
                  ? { ...m, content: finalContent }
                  : m
              ),
              isStreaming: false,
              isContinuing: false,
              streamingContent: "",
              streamStartTime: null,
              abortController: null,
              gameState:
                ((data.state as Record<string, unknown>)
                  ?.variables as Record<string, number | string | boolean>) ??
                state.gameState,
            }));

            const audioEffects = data.audioEffects as import("@yumina/engine").AudioEffect[] | undefined;
            if (audioEffects && Array.isArray(audioEffects) && audioEffects.length > 0) {
              useAudioStore.getState().processAudioEffects(audioEffects);
            }
          },
          onError: (err) => {
            console.error("Continue error:", err);
            let errorMsg = err;
            try {
              const parsed = JSON.parse(err.replace(/^HTTP \d+: /, ""));
              if (parsed.error) errorMsg = parsed.error;
            } catch { /* use raw */ }
            set({
              isStreaming: false,
              isContinuing: false,
              streamingContent: "",
              streamStartTime: null,
              abortController: null,
              error: errorMsg,
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

  setPendingChoices: (choices) => set({ pendingChoices: choices }),
  clearPendingChoices: () => set({ pendingChoices: [] }),

  revertLastExchange: async () => {
    const { session, isStreaming } = get();
    if (!session || isStreaming) return;

    try {
      const res = await fetch(`${apiBase}/api/sessions/${session.id}/revert`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Revert failed" }));
        set({ error: (err as { error: string }).error });
        return;
      }
      const { data } = await res.json();
      const newGameState = ((data.state as Record<string, unknown>)
        ?.variables as Record<string, number | string | boolean>) ?? {};
      set({
        messages: data.messages ?? [],
        gameState: newGameState,
        pendingChoices: [],
      });
    } catch {
      set({ error: "Failed to revert" });
    }
  },

  revertToMessage: async (messageId: string) => {
    const { session, isStreaming } = get();
    if (!session || isStreaming) return;

    try {
      const res = await fetch(`${apiBase}/api/sessions/${session.id}/revert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ messageId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Revert failed" }));
        set({ error: (err as { error: string }).error });
        return;
      }
      const { data } = await res.json();
      const newGameState = ((data.state as Record<string, unknown>)
        ?.variables as Record<string, number | string | boolean>) ?? {};
      set({
        messages: data.messages ?? [],
        gameState: newGameState,
        pendingChoices: [],
      });
    } catch {
      set({ error: "Failed to revert" });
    }
  },

  restartChat: async () => {
    const { session, isStreaming } = get();
    if (!session || isStreaming) return;

    try {
      const res = await fetch(`${apiBase}/api/sessions/${session.id}/restart`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Restart failed" }));
        set({ error: (err as { error: string }).error });
        return;
      }
      const { data } = await res.json();
      const newGameState = ((data.state as Record<string, unknown>)
        ?.variables as Record<string, number | string | boolean>) ?? {};

      // Stop all audio on restart
      useAudioStore.getState().cleanup();

      set({
        messages: data.messages ?? [],
        gameState: newGameState,
        pendingChoices: [],
        error: null,
      });
    } catch {
      set({ error: "Failed to restart chat" });
    }
  },

  saveCheckpoint: async () => {
    const { session, isStreaming } = get();
    if (!session || isStreaming) return;

    try {
      const res = await fetch(`${apiBase}/api/sessions/${session.id}/checkpoints`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Save failed" }));
        set({ error: (err as { error: string }).error });
        return;
      }
      const { data } = await res.json();
      // Add to local checkpoints list
      set((s) => ({
        checkpoints: [
          {
            id: data.id,
            name: data.name,
            messageCount: data.messageCount,
            createdAt: data.createdAt,
          },
          ...s.checkpoints,
        ],
      }));
    } catch {
      set({ error: "Failed to save checkpoint" });
    }
  },

  loadCheckpoints: async () => {
    const { session } = get();
    if (!session) return;

    try {
      const res = await fetch(`${apiBase}/api/sessions/${session.id}/checkpoints`, {
        credentials: "include",
      });
      if (!res.ok) return;
      const { data } = await res.json();
      set({ checkpoints: data ?? [] });
    } catch {
      // Silently fail
    }
  },

  restoreCheckpoint: async (checkpointId: string) => {
    const { session, isStreaming } = get();
    if (!session || isStreaming) return;

    try {
      const res = await fetch(
        `${apiBase}/api/sessions/${session.id}/checkpoints/${checkpointId}/restore`,
        {
          method: "POST",
          credentials: "include",
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Restore failed" }));
        set({ error: (err as { error: string }).error });
        return;
      }
      const { data } = await res.json();
      const newGameState = ((data.state as Record<string, unknown>)
        ?.variables as Record<string, number | string | boolean>) ?? {};
      set({
        messages: data.messages ?? [],
        gameState: newGameState,
        pendingChoices: [],
      });
    } catch {
      set({ error: "Failed to restore checkpoint" });
    }
  },

  deleteCheckpoint: async (checkpointId: string) => {
    const { session } = get();
    if (!session) return;

    try {
      const res = await fetch(
        `${apiBase}/api/sessions/${session.id}/checkpoints/${checkpointId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );
      if (!res.ok) return;
      set((s) => ({
        checkpoints: s.checkpoints.filter((cp) => cp.id !== checkpointId),
      }));
    } catch {
      // Silently fail
    }
  },

  setVariableDirectly: (id, value) => {
    set((s) => ({
      gameState: { ...s.gameState, [id]: value },
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
