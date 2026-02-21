import { useState, useRef, useCallback, useEffect } from "react";
import { Send, Square, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useChatStore } from "@/stores/chat";

export function MessageInput() {
  const [content, setContent] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const {
    sendMessage,
    stopGeneration,
    isStreaming,
    pendingChoices,
    clearPendingChoices,
  } = useChatStore();

  const handleSend = useCallback(() => {
    const trimmed = content.trim();
    if (!trimmed || isStreaming) return;
    sendMessage(trimmed);
    setContent("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [content, isStreaming, sendMessage]);

  const handleChoiceClick = useCallback(
    (choice: string) => {
      if (isStreaming) return;
      sendMessage(choice);
      setContent("");
    },
    [isStreaming, sendMessage]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  }, [content]);

  return (
    <div className="shrink-0 px-4 pb-4 pt-2">
      <div className="mx-auto max-w-3xl">
        {/* Choice buttons */}
        {pendingChoices.length > 0 && !isStreaming && (
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            {pendingChoices.map((choice, i) => (
              <button
                key={i}
                onClick={() => handleChoiceClick(choice)}
                className={cn(
                  "rounded-lg border border-border/50 bg-accent px-3 py-1.5 text-xs font-medium text-foreground/80",
                  "transition-colors hover:border-primary/30 hover:bg-primary/10 hover:text-primary"
                )}
              >
                {choice}
              </button>
            ))}
            <button
              onClick={clearPendingChoices}
              className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground/30 transition-colors hover:text-muted-foreground/60"
              title="Dismiss choices"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* Glass reply bar card */}
        <div className="glass overflow-hidden rounded-2xl">
          {/* Textarea — full width */}
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isStreaming
                ? "Generating..."
                : pendingChoices.length > 0
                  ? "Pick a choice above, or type your own action..."
                  : "Type whatever you want to do in this world!"
            }
            disabled={isStreaming}
            rows={1}
            className="block w-full resize-none bg-transparent px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none disabled:opacity-30"
          />

          {/* Bottom row: + button (left) | send (right) */}
          <div className="flex items-center justify-between px-3 pb-2.5">
            {/* Left: plus/menu button */}
            <button
              className="hover-surface flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground"
              title="Actions"
            >
              <Plus className="h-4 w-4" />
            </button>

            {/* Right: send/stop */}
            <div className="flex items-center gap-2">
              {isStreaming ? (
                <button
                  onClick={stopGeneration}
                  className="hover-surface-strong flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground"
                  title="Stop generation"
                >
                  <Square className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={handleSend}
                  disabled={!content.trim()}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity disabled:opacity-20 disabled:pointer-events-none"
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
