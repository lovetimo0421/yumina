import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
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

  // Close on outside click
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
        className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-muted-foreground transition-colors duration-150 hover:bg-white/8 hover:text-foreground"
      >
        <span className="max-w-[120px] truncate">{current.name}</span>
        <ChevronDown
          className={`h-3 w-3 opacity-60 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute bottom-[calc(100%+6px)] right-0 z-50 min-w-[240px] rounded-xl border border-white/12 bg-[var(--glass-bg)] p-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-xl">
          {CURATED_MODELS.map((model) => (
            <button
              key={model.id}
              onClick={() => {
                setSelectedModel(model.id);
                setOpen(false);
              }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors duration-150 hover:bg-white/10"
            >
              <div className="flex-1">
                <p className="text-sm text-foreground">{model.name}</p>
                <p className="text-[11px] text-muted-foreground/60">
                  {model.desc}
                </p>
              </div>
              {selectedModel === model.id && (
                <Check className="h-4 w-4 shrink-0 text-primary" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
