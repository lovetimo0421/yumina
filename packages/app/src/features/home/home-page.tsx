import { useSession } from "@/lib/auth-client";
import { Link } from "@tanstack/react-router";
import { Globe, MessageSquare, Settings } from "lucide-react";

export function HomePage() {
  const { data: session } = useSession();

  return (
    <div className="flex flex-col gap-8 p-8">
      <div>
        <h1 className="text-2xl font-bold">
          Welcome back, {session?.user?.name ?? "Adventurer"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground/60">
          Your interactive fiction workspace
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <QuickCard
          icon={<Globe className="h-5 w-5 text-primary" />}
          title="Browse Worlds"
          description="Explore available worlds and start a new adventure."
          linkTo="/app/worlds"
          linkLabel="Explore Worlds"
        />
        <QuickCard
          icon={<MessageSquare className="h-5 w-5 text-primary" />}
          title="Recent Sessions"
          description="Continue your ongoing adventures from the sidebar."
        />
        <QuickCard
          icon={<Settings className="h-5 w-5 text-primary" />}
          title="Setup API Key"
          description="Add your OpenRouter API key to start chatting with AI characters."
          linkTo="/app/settings"
          linkLabel="Go to Settings"
        />
      </div>
    </div>
  );
}

function QuickCard({
  icon,
  title,
  description,
  linkTo,
  linkLabel,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  linkTo?: "/app/worlds" | "/app/settings";
  linkLabel?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="font-semibold">{title}</h3>
      </div>
      <p className="mt-2 text-sm text-muted-foreground/60">{description}</p>
      {linkTo && linkLabel && (
        <Link
          to={linkTo}
          className="mt-4 inline-flex items-center rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors duration-150 hover:bg-white/8"
        >
          {linkLabel}
        </Link>
      )}
    </div>
  );
}
