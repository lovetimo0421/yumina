import { useEffect } from "react";
import { useChatStore } from "@/stores/chat";
import { SessionHeader } from "./session-header";
import { MessageList } from "./message-list";
import { MessageInput } from "./message-input";
import { GamePanel } from "./game-panel";

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
        <div className="flex flex-col items-center gap-2">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
          <p className="text-sm">Loading session...</p>
        </div>
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
      <GamePanel />
    </div>
  );
}
