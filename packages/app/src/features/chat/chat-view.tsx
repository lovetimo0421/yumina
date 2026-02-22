import { useEffect, useMemo, useState } from "react";
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
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    loadSession(sessionId);
  }, [sessionId, loadSession]);

  const worldDef = session?.world?.schema as unknown as WorldDefinition | undefined;
  const fullScreenComponent = worldDef?.settings?.fullScreenComponent ?? false;

  const visibleCustomComponents = useMemo(
    () =>
      (worldDef?.customComponents ?? [])
        .filter((cc) => cc.visible)
        .sort((a, b) => a.order - b.order),
    [worldDef?.customComponents]
  );

  const hasVisibleCustomComponents = visibleCustomComponents.length > 0;

  // Esc key exits full-screen mode back to worlds list
  useEffect(() => {
    if (!fullScreenComponent || !hasVisibleCustomComponents) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        router.navigate({ to: "/app/worlds" });
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [fullScreenComponent, hasVisibleCustomComponents, router]);

  // Build YuminaAPI for custom components
  const yuminaAPI = useMemo<YuminaAPI>(
    () => ({
      sendMessage: (text: string) => useChatStore.getState().sendMessage(text),
      setVariable: (id: string, value: number | string | boolean) =>
        useChatStore.getState().setVariableDirectly(id, value),
      executeAction: (actionId: string) =>
        useChatStore.getState().executeActionRule(actionId),
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

  // Full-screen: custom components take over, no chat chrome
  if (fullScreenComponent && hasVisibleCustomComponents) {
    return (
      <div className="flex h-full w-full flex-col">
        {visibleCustomComponents.map((cc) => (
          <div key={cc.id} className={visibleCustomComponents.length === 1 ? "flex-1" : ""}>
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

  // Standard chat layout with optional component sidebar
  return (
    <div className="flex h-full">
      <div className="flex flex-1 flex-col overflow-hidden">
        <SessionHeader
          showSidebarToggle={hasVisibleCustomComponents}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />
        <MessageList />
        <MessageInput />
      </div>

      {/* Component sidebar */}
      {hasVisibleCustomComponents && sidebarOpen && (
        <div className="flex w-80 shrink-0 flex-col overflow-y-auto border-l border-border bg-background">
          {visibleCustomComponents.map((cc) => (
            <div key={cc.id} className="border-b border-border last:border-b-0">
              <CustomComponentRenderer
                code={cc.tsxCode}
                variables={gameState}
                worldName={worldDef?.name}
                api={yuminaAPI}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
