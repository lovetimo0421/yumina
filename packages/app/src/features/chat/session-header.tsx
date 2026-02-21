import { useState, useEffect } from "react";
import { useChatStore } from "@/stores/chat";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, PanelRight, Download, FileText, FileJson } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportAsMarkdown, exportAsJson } from "./export-chat";
import type { WorldDefinition } from "@yumina/engine";

interface SessionHeaderProps {
  showSidebarToggle?: boolean;
  sidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

export function SessionHeader({
  showSidebarToggle,
  sidebarOpen,
  onToggleSidebar,
}: SessionHeaderProps) {
  const { session, messages, isStreaming, streamStartTime } = useChatStore();

  if (!session) return null;

  const worldDef = session.world?.schema as unknown as
    | WorldDefinition
    | undefined;
  const characterEntry = worldDef?.entries?.find((e) => e.role === "character");
  const characterName = characterEntry?.name ?? worldDef?.characters?.[0]?.name ?? "AI";
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

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
            title="Export chat"
          >
            <Download className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => exportAsMarkdown(session, messages)}>
            <FileText className="mr-2 h-4 w-4" />
            Export Markdown
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => exportAsJson(session, messages)}>
            <FileJson className="mr-2 h-4 w-4" />
            Export JSON
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {showSidebarToggle && (
        <button
          onClick={onToggleSidebar}
          className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
            sidebarOpen
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
          title={sidebarOpen ? "Hide components" : "Show components"}
        >
          <PanelRight className="h-4 w-4" />
        </button>
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
