import { create } from "zustand";

const apiBase = import.meta.env.VITE_API_URL || "";

export interface StudioChatMessage {
  role: "user" | "assistant";
  content: string;
  actions?: StudioAction[];
}

export interface StudioAction {
  type: string;
  data: Record<string, unknown>;
}

interface StudioState {
  // Chat
  chatMessages: StudioChatMessage[];
  isChatStreaming: boolean;
  chatStreamContent: string;

  // Selection
  selectedElementId: string | null;
  selectedElementType: string | null;

  // Mode
  mode: "edit" | "playtest";
  activePanel: string;

  // Playtest
  playtestSessionId: string | null;

  // Actions
  sendChatMessage: (
    worldId: string,
    content: string,
    model: string,
    onActions?: (actions: StudioAction[]) => void
  ) => Promise<void>;
  setSelectedElement: (id: string | null, type?: string | null) => void;
  setMode: (mode: "edit" | "playtest") => void;
  setActivePanel: (panel: string) => void;
  setPlaytestSessionId: (id: string | null) => void;
  clearChat: () => void;
}

export const useStudioStore = create<StudioState>((set, get) => ({
  chatMessages: [],
  isChatStreaming: false,
  chatStreamContent: "",
  selectedElementId: null,
  selectedElementType: null,
  mode: "edit",
  activePanel: "canvas",
  playtestSessionId: null,

  sendChatMessage: async (worldId, content, model, onActions) => {
    const { chatMessages, selectedElementId, activePanel } = get();

    const userMessage: StudioChatMessage = { role: "user", content };
    set({
      chatMessages: [...chatMessages, userMessage],
      isChatStreaming: true,
      chatStreamContent: "",
    });

    try {
      const response = await fetch(`${apiBase}/api/studio/${worldId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          messages: [...chatMessages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          context: {
            selectedElement: selectedElementId,
            activePanel,
          },
          model,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        const errMsg: StudioChatMessage = {
          role: "assistant",
          content: `Error: ${err.error || "Request failed"}`,
        };
        set((s) => ({
          chatMessages: [...s.chatMessages, errMsg],
          isChatStreaming: false,
        }));
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let buffer = "";
      let streamedText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                streamedText += parsed.content;
                set({ chatStreamContent: streamedText });
              }
              if (parsed.message !== undefined) {
                // Done event
                const assistantMsg: StudioChatMessage = {
                  role: "assistant",
                  content: parsed.message,
                  actions: parsed.actions,
                };
                set((s) => ({
                  chatMessages: [...s.chatMessages, assistantMsg],
                  isChatStreaming: false,
                  chatStreamContent: "",
                }));
                if (parsed.actions?.length > 0 && onActions) {
                  onActions(parsed.actions);
                }
              }
              if (parsed.error) {
                const errMsg: StudioChatMessage = {
                  role: "assistant",
                  content: `Error: ${parsed.error}`,
                };
                set((s) => ({
                  chatMessages: [...s.chatMessages, errMsg],
                  isChatStreaming: false,
                  chatStreamContent: "",
                }));
              }
            } catch {
              // skip malformed JSON
            }
          }
        }
      }
    } catch (err) {
      const errMsg: StudioChatMessage = {
        role: "assistant",
        content: `Error: ${err instanceof Error ? err.message : "Connection failed"}`,
      };
      set((s) => ({
        chatMessages: [...s.chatMessages, errMsg],
        isChatStreaming: false,
        chatStreamContent: "",
      }));
    }
  },

  setSelectedElement: (id, type = null) =>
    set({ selectedElementId: id, selectedElementType: type }),

  setMode: (mode) => set({ mode }),

  setActivePanel: (panel) => set({ activePanel: panel }),

  setPlaytestSessionId: (id) => set({ playtestSessionId: id }),

  clearChat: () =>
    set({ chatMessages: [], isChatStreaming: false, chatStreamContent: "" }),
}));
