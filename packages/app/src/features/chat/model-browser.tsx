import { useState, useEffect, useMemo } from "react";
import { X, Search, Loader2, Clock, Star, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { useModelsStore, type ModelInfo } from "@/stores/models";

interface ModelBrowserProps {
  open: boolean;
  onClose: () => void;
  onSelect: (modelId: string) => void;
  selectedModel: string;
}

const PROVIDER_COLORS: Record<string, string> = {
  Anthropic: "text-orange-400",
  OpenAI: "text-green-400",
  Google: "text-blue-400",
  Meta: "text-sky-400",
  Mistral: "text-violet-400",
  DeepSeek: "text-cyan-400",
  Cohere: "text-pink-400",
};

function formatPrice(price: number): string {
  if (price === 0) return "Free";
  if (price < 0.001) return `$${(price * 1_000_000).toFixed(2)}/M`;
  return `$${(price * 1_000_000).toFixed(2)}/M`;
}

function formatContext(length: number): string {
  if (length >= 1_000_000) return `${(length / 1_000_000).toFixed(1)}M`;
  if (length >= 1000) return `${(length / 1000).toFixed(0)}k`;
  return String(length);
}

export function ModelBrowser({
  open,
  onClose,
  onSelect,
  selectedModel,
}: ModelBrowserProps) {
  const { models, curated, recentlyUsed, loading, fetchModels } =
    useModelsStore();
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (open) {
      fetchModels();
    }
  }, [open, fetchModels]);

  // Filter models by search
  const filtered = useMemo(() => {
    if (!query) return models;
    const q = query.toLowerCase();
    return models.filter(
      (m) =>
        m.id.toLowerCase().includes(q) ||
        m.name.toLowerCase().includes(q) ||
        m.provider.toLowerCase().includes(q)
    );
  }, [models, query]);

  // Recently used models
  const recentModels = useMemo(
    () =>
      recentlyUsed
        .map((id) => models.find((m) => m.id === id))
        .filter(Boolean) as ModelInfo[],
    [recentlyUsed, models]
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Panel */}
      <div className="relative flex h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Layers className="h-4 w-4 text-primary" />
          <h2 className="flex-1 font-semibold text-foreground">
            Browse Models
          </h2>
          <button
            onClick={onClose}
            className="hover-surface rounded-lg p-1 text-muted-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search */}
        <div className="border-b border-border px-4 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/40" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search models..."
              autoFocus
              className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        {/* Model list */}
        <div className="flex-1 overflow-y-auto p-2">
          {loading && models.length === 0 && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/40" />
            </div>
          )}

          {/* Recently Used */}
          {!query && recentModels.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-1.5 px-2 py-1.5">
                <Clock className="h-3 w-3 text-muted-foreground/40" />
                <span className="text-xs font-medium text-muted-foreground/50">
                  Recently Used
                </span>
              </div>
              {recentModels.map((m) => (
                <ModelCard
                  key={`recent-${m.id}`}
                  model={m}
                  selected={selectedModel === m.id}
                  onSelect={() => {
                    onSelect(m.id);
                    onClose();
                  }}
                />
              ))}
            </div>
          )}

          {/* Curated / Popular */}
          {!query && curated.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-1.5 px-2 py-1.5">
                <Star className="h-3 w-3 text-muted-foreground/40" />
                <span className="text-xs font-medium text-muted-foreground/50">
                  Popular
                </span>
              </div>
              {curated.map((m) => (
                <ModelCard
                  key={`curated-${m.id}`}
                  model={m}
                  selected={selectedModel === m.id}
                  onSelect={() => {
                    onSelect(m.id);
                    onClose();
                  }}
                />
              ))}
            </div>
          )}

          {/* All models / search results */}
          <div>
            {query && (
              <div className="px-2 py-1.5">
                <span className="text-xs font-medium text-muted-foreground/50">
                  {filtered.length} model{filtered.length !== 1 ? "s" : ""}{" "}
                  found
                </span>
              </div>
            )}
            {!query && (
              <div className="flex items-center gap-1.5 px-2 py-1.5">
                <Layers className="h-3 w-3 text-muted-foreground/40" />
                <span className="text-xs font-medium text-muted-foreground/50">
                  All Models
                </span>
              </div>
            )}
            {filtered.map((m) => (
              <ModelCard
                key={m.id}
                model={m}
                selected={selectedModel === m.id}
                onSelect={() => {
                  onSelect(m.id);
                  onClose();
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ModelCard({
  model,
  selected,
  onSelect,
}: {
  model: ModelInfo;
  selected: boolean;
  onSelect: () => void;
}) {
  const colorClass =
    PROVIDER_COLORS[model.provider] ?? "text-muted-foreground";

  return (
    <button
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
        selected ? "active-surface" : "hover-surface"
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground truncate">
            {model.name}
          </span>
          {model.isCurated && (
            <Star className="h-3 w-3 shrink-0 text-primary/60" />
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className={cn("text-xs", colorClass)}>{model.provider}</span>
          {model.contextLength > 0 && (
            <span className="text-xs text-muted-foreground/40">
              {formatContext(model.contextLength)} ctx
            </span>
          )}
          {model.pricing && (
            <span className="text-xs text-muted-foreground/40">
              {formatPrice(model.pricing.prompt)} in /{" "}
              {formatPrice(model.pricing.completion)} out
            </span>
          )}
        </div>
      </div>
      {selected && (
        <div className="h-2 w-2 shrink-0 rounded-full bg-primary" />
      )}
    </button>
  );
}
