import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useChatStore } from "@/stores/chat";

const CURATED_MODELS = [
  { id: "anthropic/claude-sonnet-4", name: "Claude Sonnet 4", desc: "Fast & smart" },
  { id: "anthropic/claude-opus-4", name: "Claude Opus 4", desc: "Most capable" },
  { id: "openai/gpt-4o-mini", name: "GPT-4o Mini", desc: "Fast & cheap" },
  { id: "openai/gpt-4o", name: "GPT-4o", desc: "Balanced" },
  { id: "google/gemini-2.5-pro-preview", name: "Gemini 2.5 Pro", desc: "Google's best" },
  { id: "meta-llama/llama-4-maverick", name: "Llama 4 Maverick", desc: "Open source" },
];

export function ModelSelector() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { selectedModel, setSelectedModel } = useChatStore();

  const current =
    CURATED_MODELS.find((m) => m.id === selectedModel) ?? CURATED_MODELS[0]!;

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="hover-surface flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground"
      >
        <span className="max-w-[140px] truncate">{current.name}</span>
        <ChevronDown
          className={cn(
            "h-3 w-3 opacity-40 transition-transform duration-150",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div className="glass absolute bottom-[calc(100%+4px)] left-0 z-50 min-w-[240px] rounded-xl p-1.5 shadow-xl shadow-black/30">
          {CURATED_MODELS.map((model) => (
            <button
              key={model.id}
              onClick={() => {
                setSelectedModel(model.id);
                setOpen(false);
              }}
              className="hover-surface flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left"
            >
              <div className="flex-1">
                <p className="text-sm text-foreground">{model.name}</p>
                <p className="text-[11px] text-muted-foreground/50">
                  {model.desc}
                </p>
              </div>
              {selectedModel === model.id && (
                <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
