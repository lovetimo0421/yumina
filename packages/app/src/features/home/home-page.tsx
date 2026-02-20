import { useSession } from "@/lib/auth-client";

export function HomePage() {
  const { data: session } = useSession();

  return (
    <div className="flex flex-col gap-8 p-8">
      <div>
        <h1 className="text-3xl font-bold">
          Welcome back, {session?.user?.name ?? "Adventurer"}
        </h1>
        <p className="mt-2 text-muted-foreground">
          Your interactive fiction workspace
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="font-semibold">Recent Sessions</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            No recent play sessions yet. Start exploring worlds to begin your
            adventure.
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="font-semibold">Your Worlds</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            You haven't created any worlds yet. The creator tools are coming in a
            future update.
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="font-semibold">Discover</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            The content hub is coming soon. Stay tuned for community-created
            worlds.
          </p>
        </div>
      </div>
    </div>
  );
}
