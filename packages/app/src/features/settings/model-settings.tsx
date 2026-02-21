import { useState } from "react";
import { Check, Layers } from "lucide-react";
import { useChatStore } from "@/stores/chat";
import { useModelsStore } from "@/stores/models";
import { ModelBrowser } from "@/features/chat/model-browser";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const CURATED_MODELS = [
  { id: "anthropic/claude-sonnet-4", name: "Claude Sonnet 4", desc: "Fast & smart" },
  { id: "anthropic/claude-opus-4", name: "Claude Opus 4", desc: "Most capable" },
  { id: "openai/gpt-4o-mini", name: "GPT-4o Mini", desc: "Fast & cheap" },
  { id: "openai/gpt-4o", name: "GPT-4o", desc: "Balanced" },
  { id: "google/gemini-2.5-pro-preview", name: "Gemini 2.5 Pro", desc: "Google's best" },
  { id: "meta-llama/llama-4-maverick", name: "Llama 4 Maverick", desc: "Open source" },
];

export function ModelSettings() {
  const [browserOpen, setBrowserOpen] = useState(false);
  const { selectedModel, setSelectedModel } = useChatStore();
  const { addToRecent } = useModelsStore();

  const handleSelect = (modelId: string) => {
    setSelectedModel(modelId);
    addToRecent(modelId);
  };

  return (
    <>
      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Default Model
          </CardTitle>
          <CardDescription className="text-muted-foreground/50">
            Choose the AI model used for all conversations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {CURATED_MODELS.map((model) => (
            <button
              key={model.id}
              onClick={() => handleSelect(model.id)}
              className="flex w-full items-center gap-3 rounded-lg border border-border px-4 py-3 text-left transition-colors hover:border-primary/30"
            >
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{model.name}</p>
                <p className="text-[11px] text-muted-foreground/50">{model.desc}</p>
              </div>
              {selectedModel === model.id && (
                <Check className="h-4 w-4 shrink-0 text-primary" />
              )}
            </button>
          ))}

          <button
            onClick={() => setBrowserOpen(true)}
            className="flex w-full items-center gap-2.5 rounded-lg border border-dashed border-border px-4 py-3 text-left text-sm text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
          >
            <Layers className="h-4 w-4 text-primary/60" />
            Browse all models...
          </button>
        </CardContent>
      </Card>

      <ModelBrowser
        open={browserOpen}
        onClose={() => setBrowserOpen(false)}
        onSelect={(modelId) => {
          handleSelect(modelId);
          setBrowserOpen(false);
        }}
        selectedModel={selectedModel}
      />
    </>
  );
}
