import { useEffect, useRef, useState, useMemo } from "react";
import { useChatStore } from "@/stores/chat";
import { MessageBubble } from "./message-bubble";
import { MessageActions } from "./message-actions";
import { SwipeControls } from "./swipe-controls";
import type { WorldDefinition, DisplayTransform } from "@yumina/engine";

export function MessageList() {
  const { messages, isStreaming, isContinuing, streamingContent, session, error, clearError } = useChatStore();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [compactedExpanded, setCompactedExpanded] = useState(false);

  const displayTransforms = useMemo<DisplayTransform[]>(() => {
    const worldDef = session?.world?.schema as unknown as WorldDefinition | undefined;
    return worldDef?.displayTransforms ?? [];
  }, [session?.world?.schema]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, streamingContent]);

  // Split messages into compacted and active
  const compactedMessages = messages.filter((m) => m.compacted);
  const activeMessages = messages.filter((m) => !m.compacted);

  if (messages.length === 0 && !isStreaming) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-muted-foreground/40">
          Start the conversation...
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Compacted messages section */}
      {compactedMessages.length > 0 && (
        <div className="border-b border-border">
          <button
            onClick={() => setCompactedExpanded(!compactedExpanded)}
            className="w-full px-4 py-2 text-center text-xs text-muted-foreground/50 hover:text-muted-foreground/70 transition-colors"
          >
            {compactedExpanded ? "Hide" : "Show"} {compactedMessages.length} earlier messages (summarized)
          </button>
          {compactedExpanded && (
            <div className="opacity-50">
              {compactedMessages.map((message) => (
                <MessageBubble key={message.id} message={message} dimmed displayTransforms={displayTransforms} />
              ))}
            </div>
          )}
        </div>
      )}

      {activeMessages.map((message, idx) => {
        // When continuing, the last assistant message shows with streaming appended
        const isContinuingThis = isContinuing && isStreaming && message.role === "assistant" &&
          idx === activeMessages.length - 1;

        return (
          <MessageBubble
            key={message.id}
            message={message}
            isStreaming={isContinuingThis}
            streamingContent={isContinuingThis ? message.content + streamingContent : undefined}
            displayTransforms={displayTransforms}
          >
            {!isContinuingThis && (
              <>
                <MessageActions message={message} />
                {message.role === "assistant" && (
                  <SwipeControls message={message} />
                )}
              </>
            )}
          </MessageBubble>
        );
      })}

      {isStreaming && !isContinuing && streamingContent && (
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
          displayTransforms={displayTransforms}
        />
      )}

      {error && (
        <div className="mx-4 mb-2 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2">
          <p className="flex-1 text-xs text-destructive">{error}</p>
          <button onClick={clearError} className="shrink-0 text-xs text-destructive/50 hover:text-destructive">
            Dismiss
          </button>
        </div>
      )}

      <div ref={bottomRef} className="h-4" />
    </div>
  );
}
