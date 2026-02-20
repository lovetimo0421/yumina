import type { LLMProvider, GenerateParams, StreamChunk, Model } from "./types.js";

const OPENAI_BASE = "https://api.openai.com/v1";

export class OpenAIProvider implements LLMProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async *generateStream(params: GenerateParams): AsyncIterable<StreamChunk> {
    // Strip openai/ prefix from model ID
    const model = params.model.replace(/^openai\//, "");

    const response = await fetch(`${OPENAI_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: params.messages,
        max_tokens: params.maxTokens,
        temperature: params.temperature,
        stream: true,
        stream_options: { include_usage: true },
        ...(params.topP !== undefined && { top_p: params.topP }),
        ...(params.frequencyPenalty !== undefined && { frequency_penalty: params.frequencyPenalty }),
        ...(params.presencePenalty !== undefined && { presence_penalty: params.presencePenalty }),
        ...(params.responseFormat && {
          response_format: { type: params.responseFormat.type },
        }),
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      yield { type: "error", content: `OpenAI error (${response.status}): ${error}` };
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      yield { type: "error", content: "No response body" };
      return;
    }

    const decoder = new TextDecoder();
    let buffer = "";

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
          if (data === "[DONE]") {
            yield { type: "done", content: "" };
            return;
          }

          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta;
            if (delta?.content) {
              yield { type: "text", content: delta.content };
            }

            if (parsed.usage) {
              yield {
                type: "done",
                content: "",
                usage: {
                  promptTokens: parsed.usage.prompt_tokens,
                  completionTokens: parsed.usage.completion_tokens,
                  totalTokens: parsed.usage.total_tokens,
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
    const response = await fetch(`${OPENAI_BASE}/models`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });

    if (!response.ok) {
      throw new Error(`Failed to list models: ${response.status}`);
    }

    const json = (await response.json()) as {
      data: Array<{ id: string; owned_by: string }>;
    };

    // Filter to GPT chat models and prefix with openai/
    const chatModels = json.data
      .filter((m) => m.id.startsWith("gpt-") || m.id.startsWith("o"))
      .map((m) => ({
        id: `openai/${m.id}`,
        name: m.id.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        contextLength: m.id.includes("gpt-4o") ? 128000 : 16384,
      }));

    return chatModels;
  }

  async verify(): Promise<boolean> {
    try {
      const response = await fetch(`${OPENAI_BASE}/models`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
