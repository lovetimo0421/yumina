import { useEffect } from "react";
import { useRouter } from "@tanstack/react-router";
import { useChatStore } from "@/stores/chat";
import { SessionHeader } from "./session-header";
import { MessageList } from "./message-list";
import { MessageInput } from "./message-input";
import { GamePanel } from "./game-panel";
import type { WorldDefinition } from "@yumina/engine";

interface ChatViewProps {
  sessionId: string;
}

export function ChatView({ sessionId }: ChatViewProps) {
  const { loadSession, session } = useChatStore();
  const router = useRouter();

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

  const worldDef = session.world?.schema as unknown as WorldDefinition | undefined;
  const layoutMode = worldDef?.settings?.layoutMode ?? "split";

  // Esc key exits immersive mode back to worlds list
  useEffect(() => {
    if (layoutMode !== "immersive") return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        router.navigate({ to: "/app/worlds" });
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [layoutMode, router]);

  // Immersive: only the creator's custom components, no Yumina chrome
  if (layoutMode === "immersive") {
    return <GamePanel layoutMode="immersive" />;
  }

  // Game-focus: 50/50 split
  if (layoutMode === "game-focus") {
    return (
      <div className="flex h-full">
        <div className="flex w-1/2 flex-col overflow-hidden border-r border-border">
          <SessionHeader />
          <MessageList />
          <MessageInput />
        </div>
        <div className="w-1/2">
          <GamePanel layoutMode="game-focus" />
        </div>
      </div>
    );
  }

  // Default split layout
  return (
    <div className="flex h-full">
      <div className="flex flex-1 flex-col overflow-hidden">
        <SessionHeader />
        <MessageList />
        <MessageInput />
      </div>
      <GamePanel layoutMode="split" />
    </div>
  );
}
