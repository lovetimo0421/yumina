import { useState, useRef } from "react";
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
  const [showActions, setShowActions] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const isUser = message.role === "user";
  const isSystem = message.role === "system";
  const displayContent = isStreaming ? streamingContent ?? "" : message.content;

  const handleMouseEnter = () => {
    clearTimeout(timeoutRef.current);
    setShowActions(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setShowActions(false), 300);
  };

  if (isSystem) {
    return (
      <div className="mx-auto max-w-xl px-4 py-2 text-center text-sm text-muted-foreground italic">
        {displayContent}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group relative flex gap-3 px-4 py-3",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-secondary text-foreground"
        )}
      >
        {isUser ? "You" : "AI"}
      </div>

      {/* Content */}
      <div
        className={cn(
          "flex max-w-[75%] flex-col gap-1",
          isUser ? "items-end" : "items-start"
        )}
      >
        <div
          className={cn(
            "rounded-lg px-4 py-2.5 text-sm leading-relaxed",
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-foreground"
          )}
        >
          <div
            dangerouslySetInnerHTML={{ __html: renderMarkdown(displayContent) }}
          />
          {isStreaming && (
            <span className="ml-1 inline-block h-4 w-1.5 animate-pulse bg-current" />
          )}
        </div>

        {/* Metadata */}
        {!isStreaming && message.generationTimeMs && (
          <span className="text-xs text-muted-foreground">
            {(message.generationTimeMs / 1000).toFixed(1)}s
            {message.tokenCount && ` · ${message.tokenCount} tokens`}
          </span>
        )}

        {/* Action buttons slot */}
        {showActions && !isStreaming && children && (
          <div className="mt-1">{children}</div>
        )}
      </div>
    </div>
  );
}
