import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "@tanstack/react-router";
import {
  Play,
  Pencil,
  Copy,
  Trash2,
  Star,
  Loader2,
  Search,
  X,
  Download,
  ChevronDown,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import { useWorldsStore, type WorldItem } from "@/stores/worlds";
import { useSession } from "@/lib/auth-client";

const apiBase = import.meta.env.VITE_API_URL || "";
const FAVORITES_KEY = "yumina-portal-favorites";

function loadFavorites(): Set<string> {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveFavorites(favs: Set<string>) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favs]));
}

export function PortalsPage() {
  const { worlds, loading, fetchWorlds } = useWorldsStore();
  const { data: session } = useSession();
  const router = useRouter();
  const [favorites, setFavorites] = useState<Set<string>>(loadFavorites);
  const [search, setSearch] = useState("");
  const [activeWorld, setActiveWorld] = useState<WorldItem | null>(null);

  useEffect(() => {
    fetchWorlds();
  }, [fetchWorlds]);

  const myWorlds = useMemo(() => {
    let filtered = worlds.filter((w) => w.creatorId === session?.user?.id);
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (w) =>
          (w.name || "").toLowerCase().includes(q) ||
          (w.description || "").toLowerCase().includes(q)
      );
    }
    return filtered.sort((a, b) => {
      const aFav = favorites.has(a.id) ? 0 : 1;
      const bFav = favorites.has(b.id) ? 0 : 1;
      if (aFav !== bFav) return aFav - bFav;
      return (a.name || "").localeCompare(b.name || "");
    });
  }, [worlds, session?.user?.id, favorites, search]);

  const toggleFavorite = useCallback((worldId: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(worldId)) next.delete(worldId);
      else next.add(worldId);
      saveFavorites(next);
      return next;
    });
  }, []);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-2xl p-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Portals</h1>
          <span className="text-xs text-muted-foreground/40">
            {myWorlds.length} world{myWorlds.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/30" />
          <input
            type="text"
            placeholder="Search your worlds..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground/30 focus:border-primary/50 focus:outline-none"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/40" />
          </div>
        ) : myWorlds.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground/50">
              {search
                ? "No worlds match your search."
                : "You haven't created any worlds yet. Use Start New to create one."}
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {myWorlds.map((world) => {
              const isFav = favorites.has(world.id);
              return (
                <button
                  key={world.id}
                  onClick={() => setActiveWorld(world)}
                  className="flex w-full items-center gap-4 rounded-xl border border-transparent px-4 py-3 text-left transition-colors hover:border-border hover:bg-card"
                >
                  {/* Avatar */}
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 text-lg font-bold text-primary/60">
                    {(world.name || "W")[0]?.toUpperCase()}
                  </div>
                  {/* Info */}
                  <div className="flex-1 overflow-hidden">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-sm font-medium text-foreground">
                        {world.name || "Untitled"}
                      </p>
                      {isFav && (
                        <Star className="h-3 w-3 shrink-0 fill-yellow-400 text-yellow-400" />
                      )}
                    </div>
                    <p className="truncate text-xs text-muted-foreground/50">
                      {world.description || "No description"}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Profile Card Modal */}
      {activeWorld && (
        <ProfileCard
          world={activeWorld}
          isFavorite={favorites.has(activeWorld.id)}
          onToggleFavorite={() => toggleFavorite(activeWorld.id)}
          onClose={() => setActiveWorld(null)}
          onPlay={async () => {
            try {
              const res = await fetch(`${apiBase}/api/sessions`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ worldId: activeWorld.id }),
              });
              if (!res.ok) { toast.error("Failed to start session"); return; }
              const { data } = await res.json();
              router.navigate({ to: "/app/chat/$sessionId", params: { sessionId: data.id } });
            } catch { toast.error("Failed to start session"); }
          }}
          onEdit={() => {
            router.navigate({ to: "/app/worlds/$worldId/edit", params: { worldId: activeWorld.id } });
          }}
          onDuplicate={async () => {
            try {
              const res = await fetch(`${apiBase}/api/worlds/${activeWorld.id}/duplicate`, {
                method: "POST",
                credentials: "include",
              });
              if (res.ok) { toast.success("World duplicated"); fetchWorlds(); setActiveWorld(null); }
              else toast.error("Failed to duplicate");
            } catch { toast.error("Failed to duplicate"); }
          }}
          onExport={() => {
            // Export as JSON
            const schema = activeWorld.schema;
            const blob = new Blob([JSON.stringify(schema, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${activeWorld.name || "world"}.json`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success("Exported as JSON");
          }}
          onDelete={async () => {
            try {
              const res = await fetch(`${apiBase}/api/worlds/${activeWorld.id}`, {
                method: "DELETE",
                credentials: "include",
              });
              if (res.ok) {
                toast.success(`Deleted "${activeWorld.name}"`);
                setFavorites((prev) => {
                  const next = new Set(prev);
                  next.delete(activeWorld.id);
                  saveFavorites(next);
                  return next;
                });
                fetchWorlds();
                setActiveWorld(null);
              } else toast.error("Failed to delete");
            } catch { toast.error("Failed to delete"); }
          }}
        />
      )}
    </div>
  );
}

/** BetterTavern-style profile card modal */
function ProfileCard({
  world,
  isFavorite,
  onToggleFavorite,
  onClose,
  onPlay,
  onEdit,
  onDuplicate,
  onExport,
  onDelete,
}: {
  world: WorldItem;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onClose: () => void;
  onPlay: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onExport: () => void;
  onDelete: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const schema = world.schema as Record<string, unknown>;
  const entries = (schema.entries ?? []) as Array<{
    position?: string;
    content?: string;
    enabled?: boolean;
  }>;

  const greeting = entries.find((e) => e.position === "greeting" && e.enabled !== false);
  const description = (schema.description as string) || world.description || "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Card */}
      <div className="relative mx-4 flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-10 rounded-full p-1.5 text-muted-foreground/40 transition-colors hover:bg-accent hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {/* Header — avatar + name */}
          <div className="flex flex-col items-center px-6 pt-8 pb-4">
            {/* Avatar circle with border ring */}
            <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-primary/40 bg-gradient-to-br from-primary/20 to-primary/5 text-3xl font-bold text-primary/60">
              {(world.name || "W")[0]?.toUpperCase()}
            </div>

            <h2 className="mt-4 text-lg font-semibold text-foreground">
              {world.name || "Untitled"}
            </h2>
            <p className="text-xs text-muted-foreground/50">
              by {(schema.author as string) || "Unknown"}
            </p>
          </div>

          {/* Toolbar */}
          <div className="flex items-center justify-center gap-2 px-6 pb-4">
            <button
              onClick={onToggleFavorite}
              className={`flex h-10 w-10 items-center justify-center rounded-lg border transition-colors ${
                isFavorite
                  ? "border-yellow-400/30 bg-yellow-400/10 text-yellow-400"
                  : "border-border text-muted-foreground/40 hover:text-yellow-400/60"
              }`}
              title={isFavorite ? "Remove from favorites" : "Add to favorites"}
            >
              <Star className={`h-4 w-4 ${isFavorite ? "fill-current" : ""}`} />
            </button>
            <button
              onClick={onEdit}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-border text-muted-foreground/40 transition-colors hover:border-primary/30 hover:text-primary"
              title="Edit world info"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={onExport}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-border text-muted-foreground/40 transition-colors hover:border-primary/30 hover:text-foreground"
              title="Export as JSON"
            >
              <Download className="h-4 w-4" />
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-border text-muted-foreground/40 transition-colors hover:border-destructive/30 hover:text-destructive"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          {/* Expandable sections */}
          <div className="space-y-1 px-4 pb-4">
            {/* Description (for hub, not AI) */}
            <details className="group rounded-lg border border-border bg-background/50">
              <summary className="flex cursor-pointer items-center gap-2.5 px-4 py-3 text-sm font-medium text-foreground transition-colors hover:text-primary">
                <MessageSquare className="h-4 w-4 text-muted-foreground/40" />
                <span className="flex-1">Description</span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/30 transition-transform group-open:rotate-180" />
              </summary>
              <div className="border-t border-border px-4 py-3">
                {description ? (
                  <p className="whitespace-pre-wrap text-sm text-foreground/80">
                    {description}
                  </p>
                ) : (
                  <p className="text-sm italic text-muted-foreground/30">
                    No description set
                  </p>
                )}
              </div>
            </details>

            {/* First Message / Greeting */}
            <details className="group rounded-lg border border-border bg-background/50">
              <summary className="flex cursor-pointer items-center gap-2.5 px-4 py-3 text-sm font-medium text-foreground transition-colors hover:text-primary">
                <MessageSquare className="h-4 w-4 text-muted-foreground/40" />
                <span className="flex-1">First Message</span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/30 transition-transform group-open:rotate-180" />
              </summary>
              <div className="border-t border-border px-4 py-3">
                {greeting?.content ? (
                  <p className="whitespace-pre-wrap text-sm text-foreground/80">
                    {greeting.content.slice(0, 500)}
                    {(greeting.content.length ?? 0) > 500 ? "..." : ""}
                  </p>
                ) : (
                  <p className="text-sm italic text-muted-foreground/30">
                    No greeting set
                  </p>
                )}
              </div>
            </details>
          </div>
        </div>

        {/* Bottom action buttons — sticky */}
        <div className="flex gap-3 border-t border-border p-4">
          <button
            onClick={onPlay}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            <Play className="h-4 w-4" />
            Open
          </button>
          <button
            onClick={onDuplicate}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-card py-3 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            <Copy className="h-4 w-4" />
            Clone
          </button>
        </div>
      </div>

      {/* Delete confirmation overlay */}
      {confirmDelete && (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmDelete(false)} />
          <div className="relative mx-4 w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-2xl">
            <h3 className="text-base font-semibold text-foreground">
              Delete "{world.name}"?
            </h3>
            <p className="mt-2 text-sm text-muted-foreground/60">
              This permanently deletes this world, all its sessions, and chat history.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setConfirmDelete(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                Cancel
              </button>
              <button
                onClick={() => { setConfirmDelete(false); onDelete(); }}
                className="rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition-opacity hover:opacity-90"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
