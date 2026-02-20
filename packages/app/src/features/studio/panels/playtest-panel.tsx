import { useState, useEffect, useRef } from "react";
import type { IDockviewPanelProps } from "dockview-react";
import { Send, Loader2, MessageSquare } from "lucide-react";
import { useStudioStore } from "@/stores/studio";
import { useEditorStore } from "@/stores/editor";

const apiBase = import.meta.env.VITE_API_URL || "";

interface PlaytestMessage {
  role: "user" | "assistant";
  content: string;
}

export function PlaytestPanel(_props: IDockviewPanelProps) {
  const { playtestSessionId, setPlaytestSessionId } = useStudioStore();
  const { worldDraft, serverWorldId } = useEditorStore();
  const [messages, setMessages] = useState<PlaytestMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamContent, setStreamContent] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Create session on mount if needed
  useEffect(() => {
    if (playtestSessionId || !serverWorldId) return;

    (async () => {
      try {
        const res = await fetch(`${apiBase}/api/sessions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ worldId: serverWorldId }),
        });
        if (!res.ok) return;
        const { data } = await res.json();
        setPlaytestSessionId(data.id);

        // Load greeting if exists
        const msgsRes = await fetch(
          `${apiBase}/api/sessions/${data.id}/messages`,
          { credentials: "include" }
        );
        if (msgsRes.ok) {
          const { data: msgsData } = await msgsRes.json();
          setMessages(
            msgsData.map((m: { role: string; content: string }) => ({
              role: m.role as "user" | "assistant",
              content: m.content,
            }))
          );
        }
      } catch {
        // ignore
      }
    })();
  }, [serverWorldId, playtestSessionId, setPlaytestSessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamContent]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming || !playtestSessionId) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setIsStreaming(true);
    setStreamContent("");

    try {
      const res = await fetch(
        `${apiBase}/api/sessions/${playtestSessionId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ content: trimmed }),
        }
      );

      if (!res.ok || !res.body) {
        setIsStreaming(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let streamed = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const parsed = JSON.parse(line.slice(6));
              if (parsed.content) {
                streamed += parsed.content;
                setStreamContent(streamed);
              }
              if (parsed.messageId) {
                // Done — use the clean text from the stream
                setMessages((prev) => [
                  ...prev,
                  { role: "assistant", content: streamed },
                ]);
                setStreamContent("");
              }
            } catch {
              // skip
            }
          }
        }
      }
    } catch {
      // ignore
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <MessageSquare className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs font-medium text-foreground">
          Playtest: {worldDraft.name}
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`text-xs whitespace-pre-wrap ${
              msg.role === "user"
                ? "text-muted-foreground"
                : "text-foreground"
            }`}
          >
            {msg.role === "user" && (
              <span className="font-medium text-primary">You: </span>
            )}
            {msg.content}
          </div>
        ))}

        {isStreaming && streamContent && (
          <div className="text-xs text-foreground whitespace-pre-wrap">
            {streamContent}
            <span className="streaming-cursor">|</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border p-2">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Type your message..."
            rows={1}
            className="flex-1 resize-none rounded-lg bg-muted px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none"
            style={{ maxHeight: "80px" }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            className="rounded-lg bg-primary p-2 text-primary-foreground transition-opacity disabled:opacity-40"
          >
            {isStreaming ? (
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
