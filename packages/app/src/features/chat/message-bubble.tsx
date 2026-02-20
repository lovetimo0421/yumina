import { renderMarkdown } from "@/lib/markdown";
import { cn } from "@/lib/utils";
import type { Message } from "@/stores/chat";

interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
  streamingContent?: string;
  children?: React.ReactNode;
}

export function MessageBubble({
  message,
  isStreaming,
  streamingContent,
  children,
}: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";
  const displayContent = isStreaming ? streamingContent ?? "" : message.content;

  if (isSystem) {
    return (
      <div className="px-4 py-2 text-center text-xs text-muted-foreground/50 italic">
        {displayContent}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group relative px-4 py-3",
        isUser && "glass-subtle"
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
        <div className="text-sm leading-relaxed text-foreground">
          <div
            dangerouslySetInnerHTML={{
              __html: renderMarkdown(displayContent),
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
        {!isStreaming && children && (
          <div className="touch-reveal mt-1 flex items-center gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
