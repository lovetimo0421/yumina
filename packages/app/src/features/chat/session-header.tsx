import { useState, useEffect } from "react";
import { useChatStore } from "@/stores/chat";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { WorldDefinition } from "@yumina/engine";

export function SessionHeader() {
  const { session, isStreaming, streamStartTime } = useChatStore();

  if (!session) return null;

  const worldDef = session.world?.schema as unknown as WorldDefinition | undefined;
  const characterName = worldDef?.characters?.[0]?.name ?? "AI";
  const worldName = session.world?.name ?? "Unknown World";

  return (
    <div className="flex items-center gap-3 border-b border-border bg-background px-4 py-3">
      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" asChild>
        <Link to="/app/worlds">
          <ArrowLeft className="h-4 w-4" />
        </Link>
      </Button>

      <div className="flex-1 overflow-hidden">
        <h2 className="truncate text-sm font-semibold">{worldName}</h2>
        <p className="truncate text-xs text-muted-foreground">
          Chatting with {characterName}
        </p>
      </div>

      {isStreaming && streamStartTime && <StreamingTimer startTime={streamStartTime} />}
    </div>
  );
}

function StreamingTimer({ startTime }: { startTime: number }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Date.now() - startTime);
    }, 100);
    return () => clearInterval(interval);
  }, [startTime]);

  return (
    <span className="shrink-0 text-xs text-muted-foreground">
      {(elapsed / 1000).toFixed(1)}s
    </span>
  );
}
