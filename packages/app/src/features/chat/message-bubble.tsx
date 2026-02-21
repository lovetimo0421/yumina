import { renderMessage } from "@/lib/markdown";
import { cn } from "@/lib/utils";
import { useChatStore } from "@/stores/chat";
import type { Message } from "@/stores/chat";
import type { DisplayTransform } from "@yumina/engine";

interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
  streamingContent?: string;
  dimmed?: boolean;
  children?: React.ReactNode;
  displayTransforms?: DisplayTransform[];
}

export function MessageBubble({
  message,
  isStreaming,
  streamingContent,
  dimmed,
  children,
  displayTransforms,
}: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";
  const displayContent = isStreaming ? streamingContent ?? "" : message.content;

  const handleClick = (e: React.MouseEvent) => {
    const el = (e.target as HTMLElement).closest("[data-yumina-choice]");
    if (el) {
      const text = el.getAttribute("data-yumina-choice");
      if (text) useChatStore.getState().sendMessage(text);
    }
  };

  if (isSystem) {
    return (
      <div className={cn(
        "px-4 py-2 text-center text-xs text-muted-foreground/50 italic",
        dimmed && "opacity-50 text-xs"
      )}>
        {displayContent}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group relative px-4 py-3",
        isUser && "glass-subtle",
        dimmed && "opacity-50"
      )}
    >
      <div className="mx-auto max-w-3xl">
        {/* Name label */}
        <p
          className={cn(
            "mb-1 text-xs font-medium",
            isUser ? "text-muted-foreground" : "text-primary"
          )}
        >
          {isUser ? "You" : "Narrator"}
        </p>

        {/* Message content — reading-style, no bubble */}
        <div className={cn(
          "text-sm leading-relaxed text-foreground",
          dimmed && "text-xs"
        )}>
          <div
            onClick={handleClick}
            dangerouslySetInnerHTML={{
              __html: renderMessage(displayContent, displayTransforms),
            }}
          />
          {isStreaming && (
            <span className="streaming-cursor ml-0.5 inline-block text-primary">
              ▎
            </span>
          )}
        </div>

        {/* Metadata */}
        {!isStreaming && !isUser && message.generationTimeMs && (
          <p className="mt-1.5 text-[11px] text-muted-foreground/40">
            {(message.generationTimeMs / 1000).toFixed(1)}s
            {message.tokenCount ? ` · ${message.tokenCount} tokens` : ""}
            {message.model ? ` · ${message.model.split("/").pop()}` : ""}
          </p>
        )}

        {/* Hover-reveal actions */}
        {!isStreaming && !dimmed && children && (
          <div className="touch-reveal mt-1 flex items-center gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
