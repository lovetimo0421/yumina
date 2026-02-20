import { useEditorStore } from "@/stores/editor";

export function SettingsSection() {
  const { worldDraft, setSettings } = useEditorStore();
  const { settings } = worldDraft;

  // Render greeting with variable interpolation for preview
  const renderedGreeting = settings.greeting.replace(
    /\{\{(\w+)\}\}/g,
    (_, varId) => {
      const v = worldDraft.variables.find((v) => v.id === varId);
      return v ? String(v.defaultValue) : `{{${varId}}}`;
    }
  );

  const templateVars = worldDraft.variables.map((v) => `{{${v.id}}}`);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Settings</h2>
        <p className="mt-1 text-sm text-muted-foreground/50">
          Configure prompts, greeting, and generation parameters
        </p>
      </div>

      <div className="space-y-6">
        {/* System Prompt */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Global System Prompt
          </label>
          <textarea
            value={settings.systemPrompt}
            onChange={(e) => setSettings("systemPrompt", e.target.value)}
            rows={6}
            placeholder="Instructions that apply to all characters in this world..."
            className="w-full rounded-lg border border-border bg-background px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-ring resize-y"
          />
          <p className="mt-1 text-xs text-muted-foreground/40">
            This is prepended before character-specific prompts
          </p>
        </div>

        {/* Greeting */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Greeting Message
          </label>
          <textarea
            value={settings.greeting}
            onChange={(e) => setSettings("greeting", e.target.value)}
            rows={4}
            placeholder="The first message the player sees when starting a session..."
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-ring resize-y"
          />
          {templateVars.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="text-xs text-muted-foreground/40">
                Variables:
              </span>
              {templateVars.map((v) => (
                <code
                  key={v}
                  className="rounded bg-accent px-1.5 py-0.5 text-xs text-primary"
                >
                  {v}
                </code>
              ))}
            </div>
          )}
        </div>

        {/* Greeting Preview */}
        {settings.greeting && (
          <div className="rounded-lg border border-border bg-accent p-4">
            <p className="mb-2 text-xs font-medium text-muted-foreground/60">
              Greeting Preview
            </p>
            <p className="text-sm text-foreground whitespace-pre-wrap">
              {renderedGreeting}
            </p>
          </div>
        )}

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
      </div>
    </div>
  );
}
