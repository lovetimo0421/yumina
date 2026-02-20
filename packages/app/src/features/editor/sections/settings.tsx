import { useEditorStore } from "@/stores/editor";

export function SettingsSection() {
  const { worldDraft, setSettings } = useEditorStore();
  const { settings } = worldDraft;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Settings</h2>
        <p className="mt-1 text-sm text-muted-foreground/50">
          Generation parameters and retrieval settings
        </p>
      </div>

      <div className="space-y-6">
        {/* Max Tokens */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Max Tokens
          </label>
          <input
            type="number"
            value={settings.maxTokens}
            onChange={(e) =>
              setSettings("maxTokens", parseInt(e.target.value) || 2048)
            }
            min={256}
            max={16384}
            step={256}
            className="w-40 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <p className="mt-1 text-xs text-muted-foreground/40">
            Maximum response length (256 - 16384)
          </p>
        </div>

        {/* Structured Output */}
        <div>
          <label className="flex items-center gap-2.5 text-sm font-medium text-foreground">
            <input
              type="checkbox"
              checked={settings.structuredOutput ?? false}
              onChange={(e) =>
                setSettings("structuredOutput", e.target.checked)
              }
              className="rounded"
            />
            Structured Output (JSON mode)
          </label>
          <p className="mt-1.5 ml-6 text-xs text-muted-foreground/40">
            When enabled, the AI responds in JSON format for more reliable state
            changes and choice lists. Falls back to regex parsing if the model
            doesn't support it. Works best with GPT-4o, Claude, and Gemini.
          </p>
        </div>

        {/* Temperature */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Temperature:{" "}
            <span className="text-primary">{settings.temperature}</span>
          </label>
          <input
            type="range"
            value={settings.temperature}
            onChange={(e) =>
              setSettings("temperature", parseFloat(e.target.value))
            }
            min={0}
            max={2}
            step={0.1}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-xs text-muted-foreground/40">
            <span>Precise (0)</span>
            <span>Creative (2)</span>
          </div>
        </div>

        {/* Entry Retrieval Settings */}
        <div className="border-t border-border pt-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">
            Entry Retrieval
          </h3>

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Token Budget
              </label>
              <input
                type="number"
                value={settings.lorebookTokenBudget ?? 2048}
                onChange={(e) =>
                  setSettings(
                    "lorebookTokenBudget",
                    parseInt(e.target.value) || 2048
                  )
                }
                min={256}
                max={8192}
                step={256}
                className="w-40 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <p className="mt-1 text-xs text-muted-foreground/40">
                Max tokens for triggered entries (256 - 8192).
                Always-send entries are not counted against this budget.
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Scan Depth
              </label>
              <input
                type="number"
                value={settings.lorebookScanDepth ?? 10}
                onChange={(e) =>
                  setSettings(
                    "lorebookScanDepth",
                    parseInt(e.target.value) || 10
                  )
                }
                min={1}
                max={50}
                className="w-40 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <p className="mt-1 text-xs text-muted-foreground/40">
                Number of recent messages to scan for keyword matches (1 - 50)
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
