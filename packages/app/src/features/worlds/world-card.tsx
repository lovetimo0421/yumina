import { useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { Play, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
        router.navigate({ to: "/app/chat/$sessionId", params: { sessionId: data.id } });
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-card transition-colors hover:border-primary/50">
      {/* Thumbnail */}
      <div className="flex h-40 items-center justify-center bg-secondary/50">
        {world.thumbnailUrl ? (
          <img
            src={world.thumbnailUrl}
            alt={world.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-4xl">🏰</span>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-semibold">{world.name}</h3>
        <p className="mt-1 flex-1 text-sm text-muted-foreground line-clamp-2">
          {world.description || "No description"}
        </p>

        <Button
          onClick={handlePlay}
          disabled={loading}
          className="mt-4 w-full"
        >
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Play className="mr-2 h-4 w-4" />
          )}
          {loading ? "Starting..." : "Play"}
        </Button>
      </div>
    </div>
  );
}
