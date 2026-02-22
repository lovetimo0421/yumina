import { useState, useMemo } from "react";
import { Play, Loader2, MessageSquare, BarChart3 } from "lucide-react";
import { useEditorStore } from "@/stores/editor";
import { useConfigStore } from "@/stores/config";
import {
  expandMacros,
  PromptBuilder,
  type GameState,
  type PromptCostBreakdown,
} from "@yumina/engine";

const CATEGORY_COLORS: Record<string, string> = {
  entry: "bg-blue-500",
  "variable-summary": "bg-emerald-500",
  "format-instructions": "bg-amber-500",
  "audio-instructions": "bg-purple-500",
};

const CATEGORY_LABELS: Record<string, string> = {
  entry: "Entry",
  "variable-summary": "Variables",
  "format-instructions": "Format",
  "audio-instructions": "Audio",
};

export function PreviewSection() {
  const { worldDraft } = useEditorStore();
  const [testSessionId, setTestSessionId] = useState<string | null>(null);
  const [testMessage, setTestMessage] = useState("");
  const [testResponse, setTestResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiBase = import.meta.env.VITE_API_URL || "";
  const selectedModel = useConfigStore((s) => s.selectedModel);

  // Build sample state for macro expansion + cost breakdown
  const sampleState = useMemo<GameState>(() => {
    const variables: Record<string, string | number | boolean> = {};
    for (const v of worldDraft.variables) {
      variables[v.id] = v.defaultValue;
    }
    return {
      worldId: "",
      variables,
      turnCount: 0,
      metadata: {
        lastUserMessageAt: new Date().toISOString(),
        lastMessage: "(sample message)",
        lastUserMessage: "(sample user message)",
        lastCharMessage: "(sample character message)",
        model: selectedModel,
      },
    };
  }, [worldDraft.variables, selectedModel]);

  // Find greeting entry and expand macros
  const greetingEntry = worldDraft.entries.find(
    (e) => e.position === "greeting" && e.enabled
  );
  const renderedGreeting = useMemo(() => {
    if (!greetingEntry) return "";
    return expandMacros(greetingEntry.content, worldDraft, sampleState);
  }, [greetingEntry, worldDraft, sampleState]);

  // Token cost breakdown
  const costBreakdown = useMemo<PromptCostBreakdown>(() => {
    const builder = new PromptBuilder();
    const structured = worldDraft.settings?.structuredOutput === true;
    return builder.buildPromptCostBreakdown(worldDraft, sampleState, structured);
  }, [worldDraft, sampleState]);

  const maxContext = worldDraft.settings?.maxContext ?? 200000;
  const costPercent = maxContext > 0
    ? ((costBreakdown.totalTokens / maxContext) * 100).toFixed(1)
    : "0";

  const handleTestPlay = async () => {
    const { saveDraft } = useEditorStore.getState();

    setLoading(true);
    setError(null);
    setTestResponse("");

    try {
      // Save first if dirty
      if (useEditorStore.getState().isDirty) {
        await saveDraft();
      }

      const worldId = useEditorStore.getState().serverWorldId;
      if (!worldId) {
        setError("Save the world first before testing.");
        setLoading(false);
        return;
      }

      // Create test session
      const res = await fetch(`${apiBase}/api/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ worldId }),
      });

      if (!res.ok) {
        setError("Failed to create test session");
        setLoading(false);
        return;
      }

      const { data } = await res.json();
      setTestSessionId(data.id);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  const handleSendTest = async () => {
    if (!testSessionId || !testMessage.trim()) return;

    setLoading(true);
    setTestResponse("");

    try {
      const res = await fetch(
        `${apiBase}/api/sessions/${testSessionId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            content: testMessage,
            model: selectedModel,
          }),
        }
      );

      if (!res.ok) {
        setError("Failed to send test message");
        setLoading(false);
        return;
      }

      // Read SSE stream
      const reader = res.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let buffer = "";
      let response = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;
          const data = trimmed.slice(6);
          try {
            const parsed = JSON.parse(data);
            if (parsed.content) {
              response += parsed.content;
              setTestResponse(response);
            }
          } catch {
            // skip
          }
        }
      }
    } catch {
      setError("Streaming error");
    } finally {
      setLoading(false);
      setTestMessage("");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Preview</h2>
        <p className="mt-1 text-sm text-muted-foreground/50">
          Test your world before publishing
        </p>
      </div>

      {/* Token Cost Breakdown */}
      {costBreakdown.blocks.length > 0 && (
        <div>
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-medium text-foreground">
            <BarChart3 className="h-4 w-4" />
            Token Cost Breakdown
          </h3>
          <div className="rounded-lg border border-border bg-card p-3 space-y-2">
            {costBreakdown.blocks.map((block, i) => {
              const pct = costBreakdown.totalTokens > 0
                ? (block.tokens / costBreakdown.totalTokens) * 100
                : 0;
              return (
                <div key={i} className="space-y-0.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      <span
                        className={`mr-1.5 inline-block h-2 w-2 rounded-full ${CATEGORY_COLORS[block.category] ?? "bg-gray-500"}`}
                      />
                      {block.label}
                      <span className="ml-1 text-muted-foreground/40">
                        ({CATEGORY_LABELS[block.category] ?? block.category})
                      </span>
                    </span>
                    <span className="font-mono text-foreground">
                      ~{block.tokens.toLocaleString()} tok
                    </span>
                  </div>
                  <div className="h-1 w-full rounded-full bg-muted">
                    <div
                      className={`h-1 rounded-full ${CATEGORY_COLORS[block.category] ?? "bg-gray-500"}`}
                      style={{ width: `${Math.max(pct, 1)}%` }}
                    />
                  </div>
                </div>
              );
            })}

            <div className="mt-3 flex items-center justify-between border-t border-border pt-2">
              <span className="text-xs font-medium text-foreground">
                Total baseline
              </span>
              <span className="font-mono text-xs text-foreground">
                ~{costBreakdown.totalTokens.toLocaleString()} tok
                <span className="ml-1 text-muted-foreground/50">
                  ({costPercent}% of {(maxContext / 1000).toFixed(0)}K context)
                </span>
              </span>
            </div>
          </div>
          <p className="mt-1 text-xs text-muted-foreground/40">
            Estimates based on always-send entries only. Triggered entries add cost at runtime.
          </p>
        </div>
      )}

      {/* Greeting Preview */}
      <div>
        <h3 className="mb-2 text-sm font-medium text-foreground">
          Greeting Message
        </h3>
        {greetingEntry ? (
          <div className="rounded-lg border border-border bg-card p-4 text-sm text-foreground whitespace-pre-wrap">
            {renderedGreeting}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground/40 italic">
            No greeting defined
          </p>
        )}
      </div>

      {/* Initial State */}
      {worldDraft.variables.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-medium text-foreground">
            Initial Game State
          </h3>
          <div className="rounded-lg border border-border bg-card p-3 space-y-1">
            {worldDraft.variables.map((v) => (
              <div key={v.id} className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{v.name}</span>
                <span className="font-mono text-sm text-primary">
                  {String(v.defaultValue)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Entries Summary */}
      {worldDraft.entries.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-medium text-foreground">
            Entries ({worldDraft.entries.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {worldDraft.entries.map((e) => (
              <span
                key={e.id}
                className="rounded-lg border border-border bg-accent px-3 py-1.5 text-sm text-foreground"
              >
                {e.name}
                <span className="ml-1 text-muted-foreground/50 text-xs">
                  {e.role}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Rules Summary */}
      {worldDraft.rules.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-medium text-foreground">
            Rules ({worldDraft.rules.length})
          </h3>
          <div className="space-y-1">
            {worldDraft.rules.map((r) => (
              <div
                key={r.id}
                className="rounded-lg border border-border bg-accent px-3 py-2 text-sm text-muted-foreground"
              >
                <span className="text-foreground">{r.name}</span>
                {r.description && (
                  <span className="ml-2 text-muted-foreground/50">
                    — {r.description}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Test Play */}
      <div className="border-t border-border pt-6">
        <h3 className="mb-3 text-sm font-medium text-foreground">Test Play</h3>

        {!testSessionId ? (
          <button
            onClick={handleTestPlay}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-40"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            Start Test Session
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground/50">
              Test session active. Send a message to see the AI response.
            </p>

            {testResponse && (
              <div className="rounded-lg border border-border bg-card p-4 text-sm text-foreground whitespace-pre-wrap">
                {testResponse}
              </div>
            )}

            <div className="flex gap-2">
              <input
                type="text"
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && !loading && handleSendTest()
                }
                placeholder="Type a test message..."
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                onClick={handleSendTest}
                disabled={loading || !testMessage.trim()}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-40"
              >
                {loading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <MessageSquare className="h-3.5 w-3.5" />
                )}
                Send
              </button>
            </div>
          </div>
        )}

        {error && (
          <p className="mt-2 text-sm text-destructive">{error}</p>
        )}
      </div>
    </div>
  );
}
