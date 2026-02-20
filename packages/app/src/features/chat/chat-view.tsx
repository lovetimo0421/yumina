import { useEffect } from "react";
import { useChatStore } from "@/stores/chat";
import { SessionHeader } from "./session-header";
import { MessageList } from "./message-list";
import { MessageInput } from "./message-input";
import { StatePanel } from "./state-panel";

interface ChatViewProps {
  sessionId: string;
}

export function ChatView({ sessionId }: ChatViewProps) {
  const { loadSession, session } = useChatStore();

  useEffect(() => {
    loadSession(sessionId);
  }, [sessionId, loadSession]);

  if (!session) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <p>Loading session...</p>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Main chat area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <SessionHeader />
        <MessageList />
        <MessageInput />
      </div>

      {/* Game state sidebar */}
      <StatePanel />
    </div>
  );
}
