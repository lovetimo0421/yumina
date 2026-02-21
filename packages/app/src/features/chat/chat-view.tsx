import { useEffect, useMemo } from "react";
import { useRouter } from "@tanstack/react-router";
import { useChatStore } from "@/stores/chat";
import { SessionHeader } from "./session-header";
import { MessageList } from "./message-list";
import { MessageInput } from "./message-input";
import {
  CustomComponentRenderer,
  type YuminaAPI,
} from "@/features/studio/lib/custom-component-renderer";
import type { WorldDefinition } from "@yumina/engine";

interface ChatViewProps {
  sessionId: string;
}

export function ChatView({ sessionId }: ChatViewProps) {
  const { loadSession, session, gameState } = useChatStore();
  const router = useRouter();

  useEffect(() => {
    loadSession(sessionId);
  }, [sessionId, loadSession]);

  const worldDef = session?.world?.schema as unknown as WorldDefinition | undefined;
  const uiMode = worldDef?.settings?.uiMode ?? "chat";

  // Esc key exits persistent mode back to worlds list
  useEffect(() => {
    if (uiMode !== "persistent") return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        router.navigate({ to: "/app/worlds" });
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [uiMode, router]);

  // Build YuminaAPI for persistent mode custom components
  const yuminaAPI = useMemo<YuminaAPI>(
    () => ({
      sendMessage: (text: string) => useChatStore.getState().sendMessage(text),
      setVariable: (id: string, value: number | string | boolean) =>
        useChatStore.getState().setVariableDirectly(id, value),
      variables: gameState,
      worldName: worldDef?.name ?? "",
    }),
    [gameState, worldDef?.name]
  );

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

  // Persistent: full-screen custom components, no chat chrome
  if (uiMode === "persistent") {
    const customComponents = worldDef?.customComponents ?? [];
    const visibleCustom = customComponents
      .filter((cc) => cc.visible)
      .sort((a, b) => a.order - b.order);

    return (
      <div className="flex h-full w-full flex-col">
        {visibleCustom.map((cc) => (
          <div key={cc.id} className={visibleCustom.length === 1 ? "flex-1" : ""}>
            <CustomComponentRenderer
              code={cc.tsxCode}
              variables={gameState}
              worldName={worldDef?.name}
              api={yuminaAPI}
            />
          </div>
        ))}
      </div>
    );
  }

  // Chat and per-reply: standard chat layout (no game panel)
  return (
    <div className="flex h-full">
      <div className="flex flex-1 flex-col overflow-hidden">
        <SessionHeader />
        <MessageList />
        <MessageInput />
      </div>
    </div>
  );
}
