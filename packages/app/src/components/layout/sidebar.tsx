import { useState, useEffect } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import {
  Home,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  Globe,
  MessageSquare,
  Trash2,
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
  { to: "/app" as const, label: "Home", icon: Home },
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
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function Sidebar() {
  const { sidebarOpen, toggleSidebar } = useUiStore();
  const { data: session } = useSession();
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionEntry[]>([]);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const res = await fetch(`${apiBase}/api/sessions`, {
          credentials: "include",
        });
        if (res.ok) {
          const { data } = await res.json();
          setSessions(data.slice(0, 10));
        }
      } catch {
        // Silently fail
      }
    };
    fetchSessions();
  }, []);

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
    <aside
      className={cn(
        "flex h-screen flex-col border-r border-sidebar-border bg-sidebar transition-all duration-200 overflow-hidden"
      )}
      style={{ width: sidebarOpen ? "var(--sidebar-width)" : "var(--sidebar-collapsed-width, 60px)" }}
    >
      {/* Logo + collapse */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
        {sidebarOpen && (
          <span className="text-lg font-bold text-primary">Yumina</span>
        )}
        <button
          onClick={toggleSidebar}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors duration-150 hover:bg-white/8 hover:text-foreground"
        >
          {sidebarOpen ? (
            <PanelLeftClose className="h-4 w-4" />
          ) : (
            <PanelLeftOpen className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="shrink-0 space-y-0.5 p-2">
        {navItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors duration-150 hover:bg-white/8 hover:text-foreground",
              "[&.active]:bg-white/12 [&.active]:text-foreground",
              !sidebarOpen && "justify-center px-2"
            )}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {sidebarOpen && <span>{item.label}</span>}
          </Link>
        ))}
      </nav>

      {/* Recent sessions */}
      {sidebarOpen && sessions.length > 0 && (
        <>
          <div className="mx-3 border-t border-border" />
          <div className="flex-1 overflow-y-auto px-2 py-2">
            <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              Recent
            </p>
            <div className="space-y-0.5">
              {sessions.map((s) => (
                <Link
                  key={s.id}
                  to="/app/chat/$sessionId"
                  params={{ sessionId: s.id }}
                  className="group flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors duration-150 hover:bg-white/8 hover:text-foreground [&.active]:bg-white/12 [&.active]:text-foreground"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-xs">
                    <MessageSquare className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="truncate text-sm">
                      {s.worldName ?? "Session"}
                    </p>
                    <p className="text-[11px] text-muted-foreground/60">
                      {timeAgo(s.updatedAt ?? s.createdAt)}
                    </p>
                  </div>
                  <button
                    className="hidden shrink-0 rounded-md p-1 text-muted-foreground/50 transition-colors hover:text-destructive group-hover:block"
                    onClick={(e) => handleDeleteSession(e, s.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="flex-1" />

      {/* User profile */}
      <div className="shrink-0 border-t border-border p-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors duration-150 hover:bg-white/8",
                !sidebarOpen && "justify-center px-0"
              )}
            >
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage src={session?.user?.image ?? undefined} />
                <AvatarFallback className="bg-secondary text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>
              {sidebarOpen && (
                <div className="flex-1 overflow-hidden text-left">
                  <p className="truncate text-sm font-medium text-foreground">
                    {session?.user?.name ?? "User"}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground/60">
                    {session?.user?.email}
                  </p>
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
