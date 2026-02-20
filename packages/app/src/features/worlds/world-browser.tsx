import { useEffect } from "react";
import { useWorldsStore } from "@/stores/worlds";
import { WorldCard } from "./world-card";
import { Loader2 } from "lucide-react";

export function WorldBrowser() {
  const { worlds, loading, error, fetchWorlds } = useWorldsStore();

  useEffect(() => {
    fetchWorlds();
  }, [fetchWorlds]);

  return (
    <div className="flex flex-col gap-6 p-8">
      <div>
        <h1 className="text-3xl font-bold">Worlds</h1>
        <p className="mt-2 text-muted-foreground">
          Choose a world to start your adventure
        </p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && (
        <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {!loading && worlds.length === 0 && (
        <div className="py-12 text-center text-muted-foreground">
          <p>No worlds available yet.</p>
          <p className="mt-1 text-sm">
            Run <code className="rounded bg-muted px-1.5 py-0.5">pnpm db:seed</code> to add the demo world.
          </p>
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {worlds.map((world) => (
          <WorldCard key={world.id} world={world} />
        ))}
      </div>
    </div>
  );
}
