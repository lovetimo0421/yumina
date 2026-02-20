import { useSession } from "@/lib/auth-client";
import { Link } from "@tanstack/react-router";
import { Globe, MessageSquare, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

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
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Browse Worlds</h3>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Explore available worlds and start a new adventure.
          </p>
          <Button variant="outline" className="mt-4" asChild>
            <Link to="/app/worlds">Explore Worlds</Link>
          </Button>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Recent Sessions</h3>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Continue your ongoing adventures from the sidebar.
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Setup API Key</h3>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Add your OpenRouter API key to start chatting with AI characters.
          </p>
          <Button variant="outline" className="mt-4" asChild>
            <Link to="/app/settings">Go to Settings</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
