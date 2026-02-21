import { useState } from "react";
import { Check, Layers } from "lucide-react";
import { useConfigStore } from "@/stores/config";
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
  { id: "google/gemini-3.1-pro", name: "Gemini 3.1 Pro", desc: "Best overall" },
  { id: "anthropic/claude-sonnet-4", name: "Claude Sonnet 4", desc: "Fast & smart" },
  { id: "openai/gpt-4o", name: "GPT-4o", desc: "Balanced" },
];

export function ModelSettings() {
  const [browserOpen, setBrowserOpen] = useState(false);
  const selectedModel = useConfigStore((s) => s.selectedModel);
  const setConfig = useConfigStore((s) => s.setConfig);
  const { addToRecent } = useModelsStore();

  const handleSelect = (modelId: string) => {
    setConfig("selectedModel", modelId);
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
