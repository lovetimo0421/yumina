import { useState, useEffect, useCallback } from "react";
import { Search, Loader2 } from "lucide-react";
import { HubCard, type HubWorld } from "./hub-card";

const apiBase = import.meta.env.VITE_API_URL || "";

const TAGS = [
  "All",
  "Fantasy",
  "Romance",
  "Adventure",
  "Horror",
  "Sci-Fi",
  "Slice of Life",
  "Mystery",
] as const;

type SortMode = "newest" | "popular";

export function ContentHub() {
  const [worlds, setWorlds] = useState<HubWorld[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState("All");
  const [sort, setSort] = useState<SortMode>("newest");

  const fetchWorlds = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("q", search.trim());
      if (activeTag !== "All") params.set("tag", activeTag);
      params.set("sort", sort);

      const res = await fetch(
        `${apiBase}/api/worlds/hub?${params.toString()}`,
        { credentials: "include" }
      );
      if (res.ok) {
        const { data } = await res.json();
        setWorlds(data);
      }
    } catch {
      // fail silently
    } finally {
      setLoading(false);
    }
  }, [search, activeTag, sort]);

  useEffect(() => {
    const timer = setTimeout(fetchWorlds, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [fetchWorlds]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 space-y-4 border-b border-border/40 px-6 pb-4 pt-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-foreground">Content Hub</h1>
          <div className="flex gap-1 rounded-lg border border-border/50 p-0.5">
            <SortButton
              active={sort === "newest"}
              onClick={() => setSort("newest")}
            >
              Newest
            </SortButton>
            <SortButton
              active={sort === "popular"}
              onClick={() => setSort("popular")}
            >
              Popular
            </SortButton>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/40" />
          <input
            type="text"
            placeholder="Search worlds..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border/50 bg-background py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground/40 focus:border-primary/50 focus:outline-none"
          />
        </div>

        {/* Tags */}
        <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
          {TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => setActiveTag(tag)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                activeTag === tag
                  ? "bg-primary text-primary-foreground"
                  : "bg-accent text-muted-foreground hover:bg-accent/80"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/40" />
          </div>
        ) : worlds.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-sm text-muted-foreground/50">
              {search || activeTag !== "All"
                ? "No worlds match your filters"
                : "No worlds published yet"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
            {worlds.map((w) => (
              <HubCard key={w.id} world={w} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SortButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
