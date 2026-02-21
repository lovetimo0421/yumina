import { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import {
  PanelLeftClose,
  PanelLeftOpen,
  Compass,
  BookUser,
  BookOpen,
  SlidersHorizontal,
  Trash2,
  Plus,
  Pin,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/ui";
import { useSession } from "@/lib/auth-client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const navItems = [
  { to: "/app/hub" as const, label: "Discover", icon: Compass },
  { to: "/app/configs" as const, label: "Configs", icon: SlidersHorizontal },
  { to: "/app/portals" as const, label: "My Worlds", icon: BookUser },
  { to: "/app/world-info" as const, label: "World Info", icon: BookOpen },
];

interface SessionEntry {
  id: string;
  worldId: string;
  worldName: string | null;
  createdAt: string;
  updatedAt: string;
}

const apiBase = import.meta.env.VITE_API_URL || "";
const PINNED_KEY = "yumina-pinned-sessions";

function loadPinned(): Set<string> {
  try {
    const raw = localStorage.getItem(PINNED_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function savePinned(pins: Set<string>) {
  localStorage.setItem(PINNED_KEY, JSON.stringify([...pins]));
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export function Sidebar() {
  const { sidebarOpen, toggleSidebar } = useUiStore();
  const { data: session } = useSession();
  const location = useLocation();
  const [sessions, setSessions] = useState<SessionEntry[]>([]);
  const [pinned, setPinned] = useState<Set<string>>(loadPinned);

  // Re-fetch sessions on route change
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const res = await fetch(`${apiBase}/api/sessions`, {
          credentials: "include",
        });
        if (res.ok) {
          const { data } = await res.json();
          setSessions(data.slice(0, 30));
        }
      } catch {
        // Silently fail
      }
    };
    fetchSessions();
  }, [location.pathname]);

  const togglePin = useCallback(
    (e: React.MouseEvent, sessionId: string) => {
      e.preventDefault();
      e.stopPropagation();
      setPinned((prev) => {
        const next = new Set(prev);
        if (next.has(sessionId)) {
          next.delete(sessionId);
        } else {
          next.add(sessionId);
        }
        savePinned(next);
        return next;
      });
    },
    []
  );

  const handleDeleteSession = async (
    e: React.MouseEvent,
    sessionId: string
  ) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const res = await fetch(`${apiBase}/api/sessions/${sessionId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
        // Remove from pinned if present
        setPinned((prev) => {
          const next = new Set(prev);
          if (next.delete(sessionId)) savePinned(next);
          return next;
        });
      }
    } catch {
      toast.error("Failed to delete session");
    }
  };

  const sortedSessions = useMemo(() => {
    // Pinned first, then by updatedAt
    return [...sessions].sort((a, b) => {
      const aPin = pinned.has(a.id) ? 0 : 1;
      const bPin = pinned.has(b.id) ? 0 : 1;
      if (aPin !== bPin) return aPin - bPin;
      return new Date(b.updatedAt ?? b.createdAt).getTime() -
        new Date(a.updatedAt ?? a.createdAt).getTime();
    });
  }, [sessions, pinned]);

  const initials =
    session?.user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) ?? "?";

  return (
    <aside className="flex h-screen flex-col overflow-hidden bg-sidebar">
      {/* Logo + collapse */}
      <div className="flex h-12 shrink-0 items-center gap-2 px-4">
        {sidebarOpen && (
          <span className="text-base font-bold text-primary">Yumina</span>
        )}
        <div className="flex-1" />
        <button
          onClick={toggleSidebar}
          className="hover-surface flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground/60"
        >
          {sidebarOpen ? (
            <PanelLeftClose className="h-4 w-4" />
          ) : (
            <PanelLeftOpen className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Start New button */}
      <div className="shrink-0 px-2 pb-1">
        <Link
          to="/app/worlds/create"
          className={cn(
            "flex items-center gap-3 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90",
            !sidebarOpen && "justify-center px-2"
          )}
        >
          <Plus className="h-4 w-4 shrink-0" />
          {sidebarOpen && <span>Start New</span>}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="shrink-0 px-2 pb-1">
        {navItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              "hover-surface flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground/80",
              "[&.active]:active-surface [&.active]:text-foreground",
              !sidebarOpen && "justify-center px-2"
            )}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {sidebarOpen && <span>{item.label}</span>}
          </Link>
        ))}
      </nav>

      {/* Recent sessions — scrollable list */}
      {sidebarOpen && (
        <>
          <div className="mx-3 border-t border-border/30" />
          <div className="flex-1 overflow-y-auto px-2 pt-2">
            <p className="mb-2 px-3 text-[11px] font-medium text-muted-foreground/40">
              Recent Worlds
            </p>
            <div className="space-y-0.5">
              {sortedSessions.map((s) => {
                const isPinned = pinned.has(s.id);
                return (
                  <Link
                    key={s.id}
                    to="/app/chat/$sessionId"
                    params={{ sessionId: s.id }}
                    className="hover-surface group flex items-center gap-3 rounded-lg px-3 py-2 [&.active]:active-surface"
                  >
                    {/* Circular avatar */}
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-xs text-muted-foreground/60">
                      <BookOpen className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <div className="flex items-center gap-1">
                        <p className="truncate text-sm text-foreground/80">
                          {s.worldName ?? "Session"}
                        </p>
                        {isPinned && (
                          <Pin className="h-2.5 w-2.5 shrink-0 rotate-45 text-primary/60" />
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground/40">
                        {timeAgo(s.updatedAt ?? s.createdAt)}
                      </p>
                    </div>
                    <div className="hidden shrink-0 items-center gap-0.5 group-hover:flex">
                      <button
                        className={cn(
                          "rounded-md p-1",
                          isPinned
                            ? "text-primary/60 hover:text-primary"
                            : "text-muted-foreground/20 hover:text-primary/60"
                        )}
                        onClick={(e) => togglePin(e, s.id)}
                        title={isPinned ? "Unpin" : "Pin to top"}
                      >
                        <Pin className="h-3 w-3" />
                      </button>
                      <button
                        className="rounded-md p-1 text-muted-foreground/20 hover:text-destructive"
                        onClick={(e) => handleDeleteSession(e, s.id)}
                        title="Delete session"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </Link>
                );
              })}
              {sortedSessions.length === 0 && (
                <p className="px-3 py-4 text-center text-xs text-muted-foreground/30">
                  No sessions yet
                </p>
              )}
            </div>
          </div>
        </>
      )}

      {!sidebarOpen && <div className="flex-1" />}

      {/* User profile — avatar click navigates to settings */}
      <div className="shrink-0 px-2 py-2">
        <Link
          to="/app/settings"
          className={cn(
            "hover-surface flex w-full items-center gap-3 rounded-lg px-3 py-2",
            !sidebarOpen && "justify-center px-0"
          )}
        >
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarImage src={session?.user?.image ?? undefined} />
            <AvatarFallback className="bg-accent text-xs text-muted-foreground/60">
              {initials}
            </AvatarFallback>
          </Avatar>
          {sidebarOpen && (
            <div className="flex-1 overflow-hidden text-left">
              <p className="truncate text-sm text-foreground/80">
                {session?.user?.name ?? "User"}
              </p>
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                <span className="text-[11px] text-muted-foreground/40">
                  Connected
                </span>
              </div>
            </div>
          )}
        </Link>
      </div>
    </aside>
  );
}
