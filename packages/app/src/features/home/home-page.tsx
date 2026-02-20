import { useSession } from "@/lib/auth-client";
import { Link } from "@tanstack/react-router";
import { Globe, MessageSquare, Settings } from "lucide-react";

export function HomePage() {
  const { data: session } = useSession();

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">
            Welcome back, {session?.user?.name ?? "Adventurer"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground/50">
            Your interactive fiction workspace
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card
            icon={<Globe className="h-5 w-5 text-primary" />}
            title="Browse Worlds"
            desc="Explore available worlds and start a new adventure."
            linkTo="/app/worlds"
            linkLabel="Explore Worlds"
          />
          <Card
            icon={<MessageSquare className="h-5 w-5 text-primary" />}
            title="Recent Sessions"
            desc="Continue your ongoing adventures from the sidebar."
          />
          <Card
            icon={<Settings className="h-5 w-5 text-primary" />}
            title="Setup API Key"
            desc="Add your OpenRouter API key to start chatting."
            linkTo="/app/settings"
            linkLabel="Go to Settings"
          />
        </div>
      </div>
    </div>
  );
}

function Card({
  icon,
  title,
  desc,
  linkTo,
  linkLabel,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  linkTo?: "/app/worlds" | "/app/settings";
  linkLabel?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="font-semibold text-foreground">{title}</h3>
      </div>
      <p className="mt-2 text-sm text-muted-foreground/50">{desc}</p>
      {linkTo && linkLabel && (
        <Link
          to={linkTo}
          className="hover-surface mt-4 inline-flex items-center rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground"
        >
          {linkLabel}
        </Link>
      )}
    </div>
  );
}
