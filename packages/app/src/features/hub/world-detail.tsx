import { useState, useEffect } from "react";
import { useRouter } from "@tanstack/react-router";
import {
  ArrowLeft,
  FolderPlus,
  Play,
  Loader2,
  BookOpen,
  Layers,
  Puzzle,
  Download,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { HubWorld } from "./hub-card";

const apiBase = import.meta.env.VITE_API_URL || "";

export function WorldDetail({ worldId }: { worldId: string }) {
  const router = useRouter();
  const [world, setWorld] = useState<HubWorld | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<
    "play" | "add" | null
  >(null);
  const [inPortal, setInPortal] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [hubRes, copyRes] = await Promise.all([
          fetch(`${apiBase}/api/worlds/hub`, { credentials: "include" }),
          fetch(`${apiBase}/api/worlds/${worldId}/my-copy`, { credentials: "include" }),
        ]);

        if (hubRes.ok) {
          const { data } = (await hubRes.json()) as { data: HubWorld[] };
          const found = data.find((w) => w.id === worldId);
          setWorld(found ?? null);
        }

        if (copyRes.ok) {
          const { data } = await copyRes.json();
          setInPortal(data.exists ?? false);
        }
      } catch {
        // fail silently
      } finally {
        setLoading(false);
      }
    })();
  }, [worldId]);

  const handlePlay = async () => {
    if (!world) return;
    setActionLoading("play");
    try {
      const res = await fetch(`${apiBase}/api/worlds/${world.id}/play-from-hub`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        toast.error("Failed to start session");
        return;
      }
      const { data } = await res.json();
      setInPortal(true);
      router.navigate({
        to: "/app/chat/$sessionId",
        params: { sessionId: data.session.id },
      });
    } catch {
      toast.error("Failed to start session");
    } finally {
      setActionLoading(null);
    }
  };

  const handleAddToMyWorlds = async () => {
    if (!world) return;
    setActionLoading("add");
    try {
      const res = await fetch(`${apiBase}/api/worlds/${world.id}/duplicate`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        toast.error("Failed to add to My Worlds");
        return;
      }
      setInPortal(true);
      toast.success("Added to My Worlds!");
      router.navigate({ to: "/app/portals" });
    } catch {
      toast.error("Failed to add to My Worlds");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/40" />
      </div>
    );
  }

  if (!world) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <p className="text-sm text-muted-foreground/50">World not found</p>
        <button
          onClick={() => router.navigate({ to: "/app/hub" })}
          className="text-sm text-primary hover:underline"
        >
          Back to Hub
        </button>
      </div>
    );
  }

  const schema = world.schema as {
    entries?: unknown[];
    variables?: unknown[];
    components?: unknown[];
  };
  const entryCount = schema.entries?.length ?? 0;
  const varCount = schema.variables?.length ?? 0;
  const compCount = schema.components?.length ?? 0;
  const initial = world.name.charAt(0).toUpperCase();
  const creatorInitial = (world.creatorName ?? "?").charAt(0).toUpperCase();

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* Back */}
      <div className="shrink-0 px-6 pt-4">
        <button
          onClick={() => router.navigate({ to: "/app/hub" })}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Hub
        </button>
      </div>

      {/* Hero */}
      <div className="mx-6 mt-4 flex h-48 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-primary/10 to-accent">
        {world.thumbnailUrl ? (
          <img
            src={world.thumbnailUrl}
            alt={world.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-6xl font-bold text-primary/20">{initial}</span>
        )}
      </div>

      {/* Content */}
      <div className="mx-6 mt-6 max-w-2xl space-y-6 pb-10">
        {/* Title + Author */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">{world.name}</h1>
          <div className="mt-2 flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={world.creatorImage ?? undefined} />
              <AvatarFallback className="bg-accent text-[10px] text-muted-foreground/60">
                {creatorInitial}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm text-muted-foreground/60">
              {world.creatorName ?? "Unknown"}
            </span>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm leading-relaxed text-muted-foreground/70">
          {world.description || "No description provided."}
        </p>

        {/* Tags */}
        {world.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {world.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Stats */}
        <div className="flex flex-wrap gap-4">
          <Stat icon={Download} label="Downloads" value={world.downloadCount} />
          <Stat icon={BookOpen} label="Entries" value={entryCount} />
          <Stat icon={Layers} label="Variables" value={varCount} />
          <Stat icon={Puzzle} label="Components" value={compCount} />
        </div>

        {/* CTAs */}
        <div className="flex gap-3">
          <button
            onClick={handlePlay}
            disabled={actionLoading !== null}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground transition-opacity disabled:opacity-40"
          >
            {actionLoading === "play" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            Play Now
          </button>

          {inPortal ? (
            <button
              disabled
              className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary/5 py-2.5 text-sm font-medium text-primary"
            >
              <Check className="h-4 w-4" />
              In Your Worlds
            </button>
          ) : (
            <button
              onClick={handleAddToMyWorlds}
              disabled={actionLoading !== null}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-card py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-40"
            >
              {actionLoading === "add" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FolderPlus className="h-4 w-4" />
              )}
              Add to My Worlds
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Download;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-accent/50 px-3 py-2">
      <Icon className="h-4 w-4 text-muted-foreground/50" />
      <div>
        <p className="text-sm font-medium text-foreground">{value}</p>
        <p className="text-[10px] text-muted-foreground/50">{label}</p>
      </div>
    </div>
  );
}
