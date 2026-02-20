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
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";

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

  const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
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

  const initials = session?.user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) ?? "?";

  return (
    <aside
      className={cn(
        "flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-200",
        sidebarOpen ? "w-64" : "w-16"
      )}
    >
      {/* Header */}
      <div className="flex h-14 items-center justify-between px-4">
        {sidebarOpen && (
          <span className="text-lg font-bold text-primary">Yumina</span>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
        >
          {sidebarOpen ? (
            <PanelLeftClose className="h-4 w-4" />
          ) : (
            <PanelLeftOpen className="h-4 w-4" />
          )}
        </Button>
      </div>

      <Separator />

      {/* Navigation */}
      <nav className="space-y-1 p-2">
        {navItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
              "[&.active]:bg-accent [&.active]:text-foreground"
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
          <Separator />
          <div className="flex-1 overflow-y-auto p-2">
            <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Recent Sessions
            </p>
            <div className="space-y-0.5">
              {sessions.map((s) => (
                <Link
                  key={s.id}
                  to="/app/chat/$sessionId"
                  params={{ sessionId: s.id }}
                  className="group flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground [&.active]:bg-accent [&.active]:text-foreground"
                >
                  <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                  <span className="flex-1 truncate">
                    {s.worldName ?? "Session"}
                  </span>
                  <button
                    className="hidden shrink-0 rounded p-0.5 text-muted-foreground hover:text-destructive group-hover:block"
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
      <Separator />

      {/* User profile */}
      <div className="p-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent",
                !sidebarOpen && "justify-center px-0"
              )}
            >
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage src={session?.user?.image ?? undefined} />
                <AvatarFallback className="text-xs">{initials}</AvatarFallback>
              </Avatar>
              {sidebarOpen && (
                <div className="flex-1 overflow-hidden text-left">
                  <p className="truncate font-medium text-foreground">
                    {session?.user?.name ?? "User"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
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
