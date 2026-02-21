import { useState, useEffect } from "react";
import { Link, useRouter, useLocation } from "@tanstack/react-router";
import {
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  Globe,
  Trash2,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/ui";
import { useSession, signOut } from "@/lib/auth-client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navItems = [
  { to: "/app/worlds" as const, label: "Worlds", icon: Globe },
  { to: "/app/settings" as const, label: "Settings", icon: Settings },
];

interface SessionEntry {
  id: string;
  worldId: string;
  worldName: string | null;
  createdAt: string;
  updatedAt: string;
}

const apiBase = import.meta.env.VITE_API_URL || "";

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
  const router = useRouter();
  const location = useLocation();
  const [sessions, setSessions] = useState<SessionEntry[]>([]);

  // Re-fetch sessions on route change (catches new session creation + navigation)
  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const res = await fetch(`${apiBase}/api/sessions`, {
          credentials: "include",
        });
        if (res.ok) {
          const { data } = await res.json();
          setSessions(data.slice(0, 15));
        }
      } catch {
        // Silently fail
      }
    };
    fetchSessions();
  }, [location.pathname]);

  const handleSignOut = async () => {
    await signOut();
    router.navigate({ to: "/login" });
  };

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
      }
    } catch {
      // Silently fail
    }
  };

  const initials =
    session?.user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) ?? "?";

  return (
    <aside className="flex h-screen flex-col overflow-hidden bg-sidebar">
      {/* Logo + collapse — matching BT header */}
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

      {/* Navigation — flat list like BT */}
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

      {/* Recent worlds — scrollable list like BT sidebar */}
      {sidebarOpen && (
        <>
          <div className="mx-3 border-t border-border/30" />
          <div className="flex-1 overflow-y-auto px-2 pt-2">
            <p className="mb-2 px-3 text-[11px] font-medium text-muted-foreground/40">
              Recent Worlds
            </p>
            <div className="space-y-0.5">
              {sessions.map((s) => (
                <Link
                  key={s.id}
                  to="/app/chat/$sessionId"
                  params={{ sessionId: s.id }}
                  className="hover-surface group flex items-center gap-3 rounded-lg px-3 py-2 [&.active]:active-surface"
                >
                  {/* Circular avatar like BT */}
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-xs text-muted-foreground/60">
                    <BookOpen className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="truncate text-sm text-foreground/80">
                      {s.worldName ?? "Session"}
                    </p>
                    <p className="text-[11px] text-muted-foreground/40">
                      {timeAgo(s.updatedAt ?? s.createdAt)}
                    </p>
                  </div>
                  <button
                    className="hidden shrink-0 rounded-md p-1 text-muted-foreground/20 hover:text-destructive group-hover:block"
                    onClick={(e) => handleDeleteSession(e, s.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </Link>
              ))}
              {sessions.length === 0 && (
                <p className="px-3 py-4 text-center text-xs text-muted-foreground/30">
                  No sessions yet
                </p>
              )}
            </div>
          </div>
        </>
      )}

      {!sidebarOpen && <div className="flex-1" />}

      {/* User profile — matching BT bottom profile */}
      <div className="shrink-0 px-2 py-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
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
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem asChild>
              <Link to="/app/settings">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
