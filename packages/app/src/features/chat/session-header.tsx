import { useState, useEffect } from "react";
import { useChatStore } from "@/stores/chat";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import type { WorldDefinition } from "@yumina/engine";

export function SessionHeader() {
  const { session, isStreaming, streamStartTime } = useChatStore();

  if (!session) return null;

  const worldDef = session.world?.schema as unknown as
    | WorldDefinition
    | undefined;
  const characterName = worldDef?.characters?.[0]?.name ?? "AI";
  const worldName = session.world?.name ?? "Unknown World";

  return (
    <div className="flex h-12 shrink-0 items-center gap-3 border-b border-border px-4">
      <Link
        to="/app/worlds"
        className="hover-surface flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
      </Link>

      <div className="flex-1 overflow-hidden">
        <h2 className="truncate text-sm font-medium text-foreground">
          {worldName}
        </h2>
        <p className="truncate text-[11px] text-muted-foreground/50">
          {characterName}
        </p>
      </div>

      {isStreaming && streamStartTime && (
        <StreamingTimer startTime={streamStartTime} />
      )}
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
    <div className="flex shrink-0 items-center gap-1.5">
      <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
      <span className="text-xs text-muted-foreground/50">
        {(elapsed / 1000).toFixed(1)}s
      </span>
    </div>
  );
}
