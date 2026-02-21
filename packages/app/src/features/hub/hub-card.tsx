import { Link } from "@tanstack/react-router";
import { Download } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export interface HubWorld {
  id: string;
  creatorId: string;
  name: string;
  description: string | null;
  schema: Record<string, unknown>;
  thumbnailUrl: string | null;
  isPublished: boolean | null;
  downloadCount: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  creatorName: string | null;
  creatorImage: string | null;
}

export function HubCard({ world }: { world: HubWorld }) {
  const initial = world.name.charAt(0).toUpperCase();
  const creatorInitial = (world.creatorName ?? "?").charAt(0).toUpperCase();

  return (
    <Link
      to="/app/hub/$worldId"
      params={{ worldId: world.id }}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-colors duration-200 hover:border-primary/30"
    >
      {/* Thumbnail */}
      <div className="relative flex h-36 items-center justify-center bg-gradient-to-br from-primary/10 to-accent">
        {world.thumbnailUrl ? (
          <img
            src={world.thumbnailUrl}
            alt={world.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-4xl font-bold text-primary/20">{initial}</span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-3.5">
        {/* Name */}
        <h3 className="truncate font-semibold text-foreground">
          {world.name}
        </h3>

        {/* Description */}
        <p className="mt-1 flex-1 text-xs text-muted-foreground/50 line-clamp-2">
          {world.description || "No description"}
        </p>

        {/* Tags */}
        {world.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {world.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
              >
                {tag}
              </span>
            ))}
            {world.tags.length > 3 && (
              <span className="text-[10px] text-muted-foreground/40">
                +{world.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Bottom row */}
        <div className="mt-3 flex items-center justify-between border-t border-border/30 pt-2.5">
          <div className="flex items-center gap-1.5 overflow-hidden">
            <Avatar className="h-5 w-5 shrink-0">
              <AvatarImage src={world.creatorImage ?? undefined} />
              <AvatarFallback className="bg-accent text-[9px] text-muted-foreground/60">
                {creatorInitial}
              </AvatarFallback>
            </Avatar>
            <span className="truncate text-xs text-muted-foreground/60">
              {world.creatorName ?? "Unknown"}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1 text-muted-foreground/40">
            <Download className="h-3 w-3" />
            <span className="text-[11px]">{world.downloadCount}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
