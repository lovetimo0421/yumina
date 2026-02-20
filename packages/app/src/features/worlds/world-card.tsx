import { useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { Play, Loader2 } from "lucide-react";
import type { WorldItem } from "@/stores/worlds";

interface WorldCardProps {
  world: WorldItem;
}

const apiBase = import.meta.env.VITE_API_URL || "";

export function WorldCard({ world }: WorldCardProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handlePlay = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ worldId: world.id }),
      });

      if (res.ok) {
        const { data } = await res.json();
        router.navigate({
          to: "/app/chat/$sessionId",
          params: { sessionId: data.id },
        });
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-colors duration-200 hover:border-primary/30">
      <div className="flex h-36 items-center justify-center bg-accent">
        {world.thumbnailUrl ? (
          <img
            src={world.thumbnailUrl}
            alt={world.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-3xl opacity-30">🏰</span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-semibold text-foreground">{world.name}</h3>
        <p className="mt-1 flex-1 text-sm text-muted-foreground/50 line-clamp-2">
          {world.description || "No description"}
        </p>

        <button
          onClick={handlePlay}
          disabled={loading}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground transition-opacity disabled:opacity-40 disabled:pointer-events-none"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          {loading ? "Starting..." : "Play"}
        </button>
      </div>
    </div>
  );
}
