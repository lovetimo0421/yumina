import { useState, useRef, useCallback, useEffect } from "react";
import { Send, Square } from "lucide-react";
import { useChatStore } from "@/stores/chat";
import { ModelSelector } from "./model-selector";

export function MessageInput() {
  const [content, setContent] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { sendMessage, stopGeneration, isStreaming } = useChatStore();

  const handleSend = useCallback(() => {
    const trimmed = content.trim();
    if (!trimmed || isStreaming) return;
    sendMessage(trimmed);
    setContent("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [content, isStreaming, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  }, [content]);

  return (
    <div className="shrink-0 px-4 pb-4">
      <div className="mx-auto max-w-4xl">
        {/* Glass card */}
        <div
          className="rounded-2xl border shadow-lg shadow-black/25"
          style={{
            background: "var(--glass-bg)",
            borderColor: "var(--glass-border)",
          }}
        >
          {/* Grid: textarea (row 1), buttons (row 2) */}
          <div className="grid grid-cols-[1fr_auto] grid-rows-[auto_auto] gap-3 p-3 pb-2.5">
            {/* Textarea — spans full width */}
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isStreaming
                  ? "Generating..."
                  : "Type whatever you want to do in this world!"
              }
              disabled={isStreaming}
              rows={1}
              className="col-span-2 min-h-[48px] resize-none rounded-xl bg-transparent px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none disabled:opacity-40"
            />

            {/* Left side — placeholder for future actions */}
            <div className="flex items-center" />

            {/* Right side — model selector + send/stop */}
            <div className="flex items-center gap-2">
              <ModelSelector />

              {isStreaming ? (
                <button
                  onClick={stopGeneration}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-foreground transition-colors duration-150 hover:bg-white/18"
                  title="Stop generation"
                >
                  <Square className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={handleSend}
                  disabled={!content.trim()}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-all duration-150 hover:brightness-110 hover:shadow-md disabled:opacity-30 disabled:cursor-default"
                  title="Send message"
                >
                  <Send className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
