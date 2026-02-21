import { useConfigStore } from "@/stores/config";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ApiKeysSettings } from "@/features/settings/api-keys";
import { ModelSettings } from "@/features/settings/model-settings";

export function ConfigsPage() {
  const { maxTokens, maxContext, temperature, streaming, setConfig, resetDefaults } =
    useConfigStore();

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-2xl space-y-6 p-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Configs</h1>
          <button
            onClick={resetDefaults}
            className="text-xs text-muted-foreground/50 transition-colors hover:text-foreground"
          >
            Reset to defaults
          </button>
        </div>

        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle>Generation Settings</CardTitle>
            <CardDescription className="text-muted-foreground/50">
              Global defaults for AI generation. Per-world settings override these.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Context/Memory Size */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">
                  Context / Memory Size
                </label>
                <span className="text-xs text-muted-foreground/50">
                  {maxContext.toLocaleString()} tokens
                </span>
              </div>
              <Input
                type="number"
                min={4096}
                max={2000000}
                step={1024}
                value={maxContext}
                onChange={(e) =>
                  setConfig("maxContext", Math.max(4096, Math.min(2000000, Number(e.target.value) || 4096)))
                }
              />
              <p className="text-[11px] text-muted-foreground/40">
                How many tokens of conversation history the AI can see (4,096 - 2,000,000)
              </p>
            </div>

            {/* Response Length */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">
                  Response Length
                </label>
                <span className="text-xs text-muted-foreground/50">
                  {maxTokens.toLocaleString()} tokens
                </span>
              </div>
              <Input
                type="number"
                min={256}
                max={32768}
                step={256}
                value={maxTokens}
                onChange={(e) =>
                  setConfig("maxTokens", Math.max(256, Math.min(32768, Number(e.target.value) || 256)))
                }
              />
              <p className="text-[11px] text-muted-foreground/40">
                Maximum tokens per AI response (256 - 32,768)
              </p>
            </div>

            {/* Temperature */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">
                  Creativity / Temperature
                </label>
                <span className="text-xs text-muted-foreground/50">
                  {temperature.toFixed(1)}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={2}
                step={0.1}
                value={temperature}
                onChange={(e) => setConfig("temperature", Number(e.target.value))}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-[11px] text-muted-foreground/40">
                <span>Precise (0)</span>
                <span>Creative (2)</span>
              </div>
            </div>

            {/* Streaming */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Streaming</p>
                <p className="text-[11px] text-muted-foreground/40">
                  Show AI responses as they generate
                </p>
              </div>
              <button
                onClick={() => setConfig("streaming", !streaming)}
                className={`relative h-6 w-11 rounded-full transition-colors ${
                  streaming ? "bg-primary" : "bg-muted"
                }`}
              >
                <span
                  className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                    streaming ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </CardContent>
        </Card>

        <ModelSettings />

        <ApiKeysSettings />
      </div>
    </div>
  );
}
