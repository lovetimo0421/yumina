import { useEffect, useRef } from "react";
import { useChatStore } from "@/stores/chat";
import { MessageBubble } from "./message-bubble";
import { MessageActions } from "./message-actions";
import { SwipeControls } from "./swipe-controls";

export function MessageList() {
  const { messages, isStreaming, streamingContent } = useChatStore();
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages or streaming content
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, streamingContent]);

  if (messages.length === 0 && !isStreaming) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-muted-foreground/50">
          Start the conversation...
        </p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-4xl py-4">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message}>
            <MessageActions message={message} />
            {message.role === "assistant" && (
              <SwipeControls message={message} />
            )}
          </MessageBubble>
        ))}

        {/* Streaming message (not yet saved) */}
        {isStreaming && streamingContent && (
          <MessageBubble
            message={{
              id: "__streaming__",
              sessionId: "",
              role: "assistant",
              content: "",
              createdAt: new Date().toISOString(),
            }}
            isStreaming
            streamingContent={streamingContent}
          />
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
