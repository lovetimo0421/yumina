import { useState, useEffect } from "react";
import { useSession } from "@/lib/auth-client";
import { Link } from "@tanstack/react-router";
import { BookUser, Plus, SlidersHorizontal, BookOpen, ArrowRight } from "lucide-react";

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
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function HomePage() {
  const { data: session } = useSession();
  const [sessions, setSessions] = useState<SessionEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const res = await fetch(`${apiBase}/api/sessions`, {
          credentials: "include",
        });
        if (res.ok) {
          const { data } = await res.json();
          setSessions(data.slice(0, 8));
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    fetchSessions();
  }, []);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">
            Welcome back, {session?.user?.name ?? "Adventurer"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground/50">
            Your interactive fiction workspace
          </p>
        </div>

        {/* Quick actions */}
        <div className="mb-8 flex flex-wrap gap-2">
          <Link
            to="/app/portals"
            className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            <BookUser className="h-4 w-4 text-primary" />
            My Worlds
          </Link>
          <Link
            to="/app/worlds/create"
            className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            <Plus className="h-4 w-4 text-primary" />
            Create World
          </Link>
          <Link
            to="/app/configs"
            className="flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            <SlidersHorizontal className="h-4 w-4 text-primary" />
            Configs
          </Link>
        </div>

        {/* Recent Sessions */}
        <div>
          <h2 className="mb-3 text-sm font-medium text-muted-foreground/60">
            Recent Sessions
          </h2>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center">
              <BookOpen className="mx-auto h-8 w-8 text-muted-foreground/30" />
              <h3 className="mt-3 font-medium text-foreground">
                Start your first adventure
              </h3>
              <p className="mt-1 text-sm text-muted-foreground/50">
                Browse the world library and start playing
              </p>
              <Link
                to="/app/portals"
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                My Worlds
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <div className="space-y-1">
              {sessions.map((s) => (
                <Link
                  key={s.id}
                  to="/app/chat/$sessionId"
                  params={{ sessionId: s.id }}
                  className="flex items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 transition-colors hover:border-border hover:bg-accent"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-muted-foreground/60">
                    <BookOpen className="h-4 w-4" />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="truncate text-sm font-medium text-foreground">
                      {s.worldName ?? "Session"}
                    </p>
                    <p className="text-xs text-muted-foreground/40">
                      {timeAgo(s.updatedAt ?? s.createdAt)}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/20" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
