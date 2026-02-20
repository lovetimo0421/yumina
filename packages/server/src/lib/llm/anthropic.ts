import type { LLMProvider, GenerateParams, StreamChunk, Model } from "./types.js";

const ANTHROPIC_BASE = "https://api.anthropic.com/v1";

export class AnthropicProvider implements LLMProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async *generateStream(params: GenerateParams): AsyncIterable<StreamChunk> {
    // Strip anthropic/ prefix from model ID
    const model = params.model.replace(/^anthropic\//, "");

    // Convert messages: Anthropic uses separate system param
    const systemMsg = params.messages.find((m) => m.role === "system");
    const nonSystemMessages = params.messages.filter((m) => m.role !== "system");

    const body: Record<string, unknown> = {
      model,
      messages: nonSystemMessages.map((m) => ({ role: m.role, content: m.content })),
      max_tokens: params.maxTokens ?? 2048,
      temperature: params.temperature,
      stream: true,
    };

    if (systemMsg) {
      body.system = systemMsg.content;
    }

    const response = await fetch(`${ANTHROPIC_BASE}/messages`, {
      method: "POST",
      headers: {
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      yield { type: "error", content: `Anthropic error (${response.status}): ${error}` };
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      yield { type: "error", content: "No response body" };
      return;
    }

    const decoder = new TextDecoder();
    let buffer = "";
    let inputTokens = 0;
    let outputTokens = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;

          const data = trimmed.slice(6);
          try {
            const parsed = JSON.parse(data);

            if (parsed.type === "content_block_delta" && parsed.delta?.text) {
              yield { type: "text", content: parsed.delta.text };
            }

            if (parsed.type === "message_start" && parsed.message?.usage) {
              inputTokens = parsed.message.usage.input_tokens ?? 0;
            }

            if (parsed.type === "message_delta" && parsed.usage) {
              outputTokens = parsed.usage.output_tokens ?? 0;
            }

            if (parsed.type === "message_stop") {
              yield {
                type: "done",
                content: "",
                usage: {
                  promptTokens: inputTokens,
                  completionTokens: outputTokens,
                  totalTokens: inputTokens + outputTokens,
                },
              };
              return;
            }
          } catch {
            // Skip unparseable lines
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    yield { type: "done", content: "" };
  }

  async listModels(): Promise<Model[]> {
    // Anthropic doesn't have a public models listing API that's useful,
    // so we return a curated list of current models
    return [
      { id: "anthropic/claude-sonnet-4-20250514", name: "Claude Sonnet 4", contextLength: 200000 },
      { id: "anthropic/claude-opus-4-20250514", name: "Claude Opus 4", contextLength: 200000 },
      { id: "anthropic/claude-haiku-3-5-20241022", name: "Claude 3.5 Haiku", contextLength: 200000 },
    ];
  }

  async verify(): Promise<boolean> {
    try {
      const response = await fetch(`${ANTHROPIC_BASE}/models`, {
        headers: {
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01",
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
