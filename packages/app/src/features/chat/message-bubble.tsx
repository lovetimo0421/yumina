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
      <div className="mx-auto max-w-xl px-4 py-2 text-center text-xs text-muted-foreground/60 italic">
        {displayContent}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group relative flex gap-3 px-4 py-1.5",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
          isUser
            ? "bg-primary/20 text-primary"
            : "bg-secondary text-foreground/70"
        )}
      >
        {isUser ? "You" : "AI"}
      </div>

      {/* Content block */}
      <div
        className={cn(
          "relative flex flex-col gap-0.5 pb-7",
          isUser ? "items-end max-w-[75%]" : "items-start max-w-[85%]"
        )}
      >
        {/* Bubble */}
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
            isUser
              ? "bg-primary/15 text-foreground"
              : "bg-secondary text-foreground"
          )}
        >
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
          <span className="px-1 text-[11px] text-muted-foreground/50">
            {(message.generationTimeMs / 1000).toFixed(1)}s
            {message.tokenCount ? ` · ${message.tokenCount} tok` : ""}
          </span>
        )}

        {/* Hover-reveal action buttons (positioned absolute at bottom of pb-7 space) */}
        {!isStreaming && children && (
          <div
            className={cn(
              "absolute bottom-0 flex items-center gap-1 opacity-0 transition-all duration-150 group-hover:opacity-100",
              isUser ? "right-0" : "left-0",
              "touch-device:opacity-100"
            )}
          >
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
