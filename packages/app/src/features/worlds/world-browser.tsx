import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { useWorldsStore } from "@/stores/worlds";
import { WorldCard } from "./world-card";
import { Loader2, Plus } from "lucide-react";

export function WorldBrowser() {
  const { worlds, loading, error, fetchWorlds } = useWorldsStore();

  useEffect(() => {
    fetchWorlds();
  }, [fetchWorlds]);

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Worlds</h1>
            <p className="mt-1 text-sm text-muted-foreground/50">
              Choose a world to start your adventure
            </p>
          </div>
          <Link
            to="/app/worlds/create"
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Create World
          </Link>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/40" />
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {!loading && worlds.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-sm text-muted-foreground/50">
              No worlds available yet.
            </p>
            <p className="mt-2 text-xs text-muted-foreground/30">
              Run{" "}
              <code className="rounded bg-accent px-1.5 py-0.5 text-foreground/60">
                pnpm db:seed
              </code>{" "}
              to add the demo world, or create your own.
            </p>
          </div>
        )}

        <div
          className="grid gap-5"
          style={{
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          }}
        >
          {worlds.map((world) => (
            <WorldCard key={world.id} world={world} />
          ))}
        </div>
      </div>
    </div>
  );
}
