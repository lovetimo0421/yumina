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
        {/* Player Name */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Player Name
          </label>
          <input
            type="text"
            value={settings.playerName ?? "User"}
            onChange={(e) =>
              setSettings("playerName", e.target.value || "User")
            }
            placeholder="User"
            className="w-60 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <p className="mt-1 text-xs text-muted-foreground/40">
            Resolves the {"{{user}}"} macro in entry content
          </p>
        </div>

        {/* Max Tokens (response length) */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Max Response Tokens
            </label>
            <input
              type="number"
              value={settings.maxTokens}
              onChange={(e) =>
                setSettings("maxTokens", parseInt(e.target.value) || 12000)
              }
              min={256}
              max={32768}
              step={256}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="mt-1 text-xs text-muted-foreground/40">
              Maximum response length (256 - 32768)
            </p>
          </div>

          {/* Max Context */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Max Context Window
            </label>
            <input
              type="number"
              value={settings.maxContext ?? 200000}
              onChange={(e) =>
                setSettings("maxContext", parseInt(e.target.value) || 200000)
              }
              min={4096}
              max={2000000}
              step={1000}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="mt-1 text-xs text-muted-foreground/40">
              Context window size for history trimming
            </p>
          </div>
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
            step={0.05}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-xs text-muted-foreground/40">
            <span>Precise (0)</span>
            <span>Creative (2)</span>
          </div>
        </div>

        {/* Top P */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Top P:{" "}
            <span className="text-primary">{settings.topP ?? 1}</span>
          </label>
          <input
            type="range"
            value={settings.topP ?? 1}
            onChange={(e) =>
              setSettings("topP", parseFloat(e.target.value))
            }
            min={0}
            max={1}
            step={0.05}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-xs text-muted-foreground/40">
            <span>Focused (0)</span>
            <span>Full range (1)</span>
          </div>
        </div>

        {/* Frequency Penalty + Presence Penalty */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Frequency Penalty:{" "}
              <span className="text-primary">
                {settings.frequencyPenalty ?? 0}
              </span>
            </label>
            <input
              type="range"
              value={settings.frequencyPenalty ?? 0}
              onChange={(e) =>
                setSettings("frequencyPenalty", parseFloat(e.target.value))
              }
              min={-2}
              max={2}
              step={0.1}
              className="w-full accent-primary"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Presence Penalty:{" "}
              <span className="text-primary">
                {settings.presencePenalty ?? 0}
              </span>
            </label>
            <input
              type="range"
              value={settings.presencePenalty ?? 0}
              onChange={(e) =>
                setSettings("presencePenalty", parseFloat(e.target.value))
              }
              min={-2}
              max={2}
              step={0.1}
              className="w-full accent-primary"
            />
          </div>
        </div>

        {/* Top K + Min P (advanced) */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Top K
            </label>
            <input
              type="number"
              value={settings.topK ?? 0}
              onChange={(e) =>
                setSettings("topK", parseInt(e.target.value) || 0)
              }
              min={0}
              max={500}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="mt-1 text-xs text-muted-foreground/40">
              0 = disabled
            </p>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Min P:{" "}
              <span className="text-primary">{settings.minP ?? 0}</span>
            </label>
            <input
              type="range"
              value={settings.minP ?? 0}
              onChange={(e) =>
                setSettings("minP", parseFloat(e.target.value))
              }
              min={0}
              max={1}
              step={0.01}
              className="w-full accent-primary"
            />
            <p className="mt-1 text-xs text-muted-foreground/40">
              0 = disabled
            </p>
          </div>
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
            doesn't support it.
          </p>
        </div>

        {/* Entry Retrieval Settings */}
        <div className="border-t border-border pt-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">
            Entry Retrieval
          </h3>

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Budget:{" "}
                <span className="text-primary">
                  {settings.lorebookBudgetPercent ?? 100}%
                </span>
                {(settings.lorebookBudgetCap ?? 0) > 0 && (
                  <span className="text-muted-foreground/60 ml-2">
                    (cap: {settings.lorebookBudgetCap} tokens)
                  </span>
                )}
              </label>
              <input
                type="range"
                value={settings.lorebookBudgetPercent ?? 100}
                onChange={(e) =>
                  setSettings(
                    "lorebookBudgetPercent",
                    parseInt(e.target.value) || 100
                  )
                }
                min={1}
                max={100}
                step={1}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-xs text-muted-foreground/40">
                <span>1%</span>
                <span>100% of context</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground/40">
                Percentage of context window allocated to triggered entries.
                Always-send entries are not counted against this budget.
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Budget Cap (tokens)
              </label>
              <input
                type="number"
                value={settings.lorebookBudgetCap ?? 0}
                onChange={(e) =>
                  setSettings(
                    "lorebookBudgetCap",
                    parseInt(e.target.value) || 0
                  )
                }
                min={0}
                max={1000000}
                step={256}
                className="w-40 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <p className="mt-1 text-xs text-muted-foreground/40">
                Hard token cap for entry budget. 0 = no cap.
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Scan Depth
              </label>
              <input
                type="number"
                value={settings.lorebookScanDepth ?? 2}
                onChange={(e) =>
                  setSettings(
                    "lorebookScanDepth",
                    parseInt(e.target.value) || 2
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

            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                Recursion Depth
              </label>
              <input
                type="number"
                value={settings.lorebookRecursionDepth ?? 0}
                onChange={(e) =>
                  setSettings(
                    "lorebookRecursionDepth",
                    Math.min(Math.max(parseInt(e.target.value) || 0, 0), 10)
                  )
                }
                min={0}
                max={10}
                className="w-40 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <p className="mt-1 text-xs text-muted-foreground/40">
                Max depth for cascading entry triggers. 0 = disabled.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
