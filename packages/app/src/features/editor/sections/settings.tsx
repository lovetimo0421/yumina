import { useEditorStore } from "@/stores/editor";

export function SettingsSection() {
  const {
    worldDraft,
    setSettings,
    addDisplayTransform,
    updateDisplayTransform,
    removeDisplayTransform,
  } = useEditorStore();
  const { settings, displayTransforms } = worldDraft;

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

        {/* UI Mode */}
        <div className="border-t border-border pt-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">
            UI Mode
          </h3>
          <div className="space-y-2">
            {([
              { value: "chat", label: "Chat", desc: "Pure conversation. No game mechanics or custom UI." },
              { value: "per-reply", label: "Per-Reply", desc: "Game UI embedded in each AI message via display transforms. Each message renders its own HUD, portraits, and choices. (Like NIAH)" },
              { value: "persistent", label: "Persistent", desc: "Full-screen custom React component. Chat is within the game. (Like Shelter)" },
            ] as const).map((opt) => (
              <label
                key={opt.value}
                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                  (settings.uiMode ?? "chat") === opt.value
                    ? "border-primary/60 bg-primary/5"
                    : "border-border hover:border-border/80"
                }`}
              >
                <input
                  type="radio"
                  name="uiMode"
                  value={opt.value}
                  checked={(settings.uiMode ?? "chat") === opt.value}
                  onChange={() => setSettings("uiMode", opt.value)}
                  className="mt-0.5 accent-primary"
                />
                <div>
                  <span className="text-sm font-medium text-foreground">{opt.label}</span>
                  <p className="mt-0.5 text-xs text-muted-foreground/50">{opt.desc}</p>
                </div>
              </label>
            ))}
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

        {/* Display Transforms */}
        <div className="border-t border-border pt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Display Transforms
              </h3>
              <p className="text-xs text-muted-foreground/40 mt-0.5">
                Regex find-and-replace rules applied to message content before rendering
              </p>
            </div>
            <button
              onClick={addDisplayTransform}
              className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
            >
              + Add Transform
            </button>
          </div>

          {displayTransforms.length === 0 ? (
            <p className="text-xs text-muted-foreground/40 italic">
              No display transforms. Transforms let you convert patterns in AI
              output into styled HTML elements.
            </p>
          ) : (
            <div className="space-y-3">
              {[...displayTransforms]
                .sort((a, b) => a.order - b.order)
                .map((t) => (
                  <div
                    key={t.id}
                    className="rounded-lg border border-border bg-background p-3 space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={t.enabled}
                        onChange={(e) =>
                          updateDisplayTransform(t.id, {
                            enabled: e.target.checked,
                          })
                        }
                        className="rounded"
                      />
                      <input
                        type="text"
                        value={t.name}
                        onChange={(e) =>
                          updateDisplayTransform(t.id, {
                            name: e.target.value,
                          })
                        }
                        className="flex-1 rounded border border-border bg-muted px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                        placeholder="Transform name"
                      />
                      <input
                        type="number"
                        value={t.order}
                        onChange={(e) =>
                          updateDisplayTransform(t.id, {
                            order: parseInt(e.target.value) || 0,
                          })
                        }
                        className="w-16 rounded border border-border bg-muted px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                        title="Order (lower runs first)"
                      />
                      <button
                        onClick={() => removeDisplayTransform(t.id)}
                        className="text-xs text-destructive hover:text-destructive/80"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-start">
                      <div>
                        <label className="text-[10px] text-muted-foreground/40 uppercase tracking-wider">
                          Pattern (regex)
                        </label>
                        <input
                          type="text"
                          value={t.pattern}
                          onChange={(e) =>
                            updateDisplayTransform(t.id, {
                              pattern: e.target.value,
                            })
                          }
                          className="w-full rounded border border-border bg-muted px-2 py-1 font-mono text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                          placeholder="\\[PEEP:(\\w+)\\]"
                        />
                      </div>
                      <div className="pt-5 text-xs text-muted-foreground/40">
                        →
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground/40 uppercase tracking-wider">
                          Replacement (HTML ok)
                        </label>
                        <input
                          type="text"
                          value={t.replacement}
                          onChange={(e) =>
                            updateDisplayTransform(t.id, {
                              replacement: e.target.value,
                            })
                          }
                          className="w-full rounded border border-border bg-muted px-2 py-1 font-mono text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                          placeholder='<span class="highlight">$1</span>'
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground/40 uppercase tracking-wider">
                        Flags
                      </label>
                      <input
                        type="text"
                        value={t.flags ?? "g"}
                        onChange={(e) =>
                          updateDisplayTransform(t.id, {
                            flags: e.target.value || "g",
                          })
                        }
                        className="w-20 rounded border border-border bg-muted px-2 py-1 font-mono text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                        placeholder="g"
                      />
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
