import { useState, useRef, useEffect, useCallback } from "react";
import type { IDockviewPanelProps } from "dockview-react";
import { Send, Loader2, Bot, User, Sparkles } from "lucide-react";
import { useStudioStore } from "@/stores/studio";
import { useEditorStore } from "@/stores/editor";
import { useModelsStore } from "@/stores/models";
import { useConfigStore } from "@/stores/config";
import { applyStudioActions } from "../lib/action-applier";

const CURATED_MODELS = [
  { id: "anthropic/claude-sonnet-4", label: "Claude Sonnet 4" },
  { id: "openai/gpt-4o-mini", label: "GPT-4o Mini" },
  { id: "openai/gpt-4o", label: "GPT-4o" },
  { id: "google/gemini-2.5-pro-preview", label: "Gemini 2.5 Pro" },
];

export function AiChatPanel(_props: IDockviewPanelProps) {
  const [input, setInput] = useState("");
  const globalModel = useConfigStore((s) => s.selectedModel);
  const [model, setModel] = useState(globalModel);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const {
    chatMessages,
    isChatStreaming,
    chatStreamContent,
    sendChatMessage,
    selectedElementId,
  } = useStudioStore();
  const { serverWorldId } = useEditorStore();
  const { fetchModels } = useModelsStore();

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, chatStreamContent]);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || isChatStreaming || !serverWorldId) return;

    setInput("");
    sendChatMessage(serverWorldId, trimmed, model, (actions) => {
      if (actions.length > 0) {
        applyStudioActions(actions);
      }
    });
  }, [input, isChatStreaming, serverWorldId, model, sendChatMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Model selector */}
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="flex-1 rounded bg-transparent text-xs text-foreground focus:outline-none [&>option]:bg-popover"
        >
          {CURATED_MODELS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
        {selectedElementId && (
          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary truncate max-w-[80px]">
            {selectedElementId}
          </span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {chatMessages.length === 0 && !isChatStreaming && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground/50 gap-2">
            <Bot className="h-8 w-8" />
            <p className="text-xs text-center">
              Ask the AI to build your world.
              <br />
              Try: "Add a health variable with max 100"
            </p>
          </div>
        )}

        {chatMessages.map((msg, i) => (
          <div key={i} className="flex gap-2">
            <div className="shrink-0 mt-0.5">
              {msg.role === "user" ? (
                <User className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Bot className="h-4 w-4 text-primary" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-foreground whitespace-pre-wrap break-words">
                {msg.content}
              </p>
              {msg.actions && msg.actions.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {msg.actions.map((action, j) => (
                    <span
                      key={j}
                      className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary"
                    >
                      {action.type}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {isChatStreaming && chatStreamContent && (
          <div className="flex gap-2">
            <Bot className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <p className="text-xs text-foreground whitespace-pre-wrap break-words flex-1">
              {chatStreamContent}
              <span className="streaming-cursor">|</span>
            </p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border p-2">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask the AI to modify your world..."
            rows={1}
            className="flex-1 resize-none rounded-lg bg-muted px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary/50"
            style={{ maxHeight: "80px" }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isChatStreaming}
            className="rounded-lg bg-primary p-2 text-primary-foreground transition-opacity disabled:opacity-40"
          >
            {isChatStreaming ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
