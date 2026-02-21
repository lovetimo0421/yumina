import type { LLMProvider, GenerateParams, StreamChunk, Model, MessageContent } from "./types.js";

const DEFAULT_OLLAMA_BASE = "http://localhost:11434";

/** Convert message content to Ollama format (text + optional images array) */
function toOllamaMessage(role: string, content: MessageContent): Record<string, unknown> {
  if (typeof content === "string") return { role, content };

  let text = "";
  const images: string[] = [];

  for (const part of content) {
    if (part.type === "text") text += part.text;
    if (part.type === "image_url") {
      const match = part.image_url.url.match(/^data:[^;]+;base64,(.+)$/);
      if (match) images.push(match[1]!);
    }
  }

  return { role, content: text, ...(images.length > 0 && { images }) };
}

export class OllamaProvider implements LLMProvider {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = (baseUrl || DEFAULT_OLLAMA_BASE).replace(/\/$/, "");
  }

  async *generateStream(params: GenerateParams): AsyncIterable<StreamChunk> {
    // Strip ollama/ prefix from model ID
    const model = params.model.replace(/^ollama\//, "");

    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: params.messages.map((m) => toOllamaMessage(m.role, m.content)),
        stream: true,
        options: {
          num_predict: params.maxTokens,
          temperature: params.temperature,
          ...(params.topP !== undefined && { top_p: params.topP }),
          ...(params.topK !== undefined && params.topK > 0 && { top_k: params.topK }),
          ...(params.minP !== undefined && params.minP > 0 && { min_p: params.minP }),
          ...(params.frequencyPenalty !== undefined && { frequency_penalty: params.frequencyPenalty }),
          ...(params.presencePenalty !== undefined && { presence_penalty: params.presencePenalty }),
        },
        ...(params.responseFormat && { format: "json" }),
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      yield { type: "error", content: `Ollama error (${response.status}): ${error}` };
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
          if (!trimmed) continue;

          try {
            const parsed = JSON.parse(trimmed);

            if (parsed.message?.content) {
              yield { type: "text", content: parsed.message.content };
            }

            if (parsed.done) {
              yield {
                type: "done",
                content: "",
                usage: parsed.eval_count
                  ? {
                      promptTokens: parsed.prompt_eval_count ?? 0,
                      completionTokens: parsed.eval_count ?? 0,
                      totalTokens:
                        (parsed.prompt_eval_count ?? 0) + (parsed.eval_count ?? 0),
                    }
                  : undefined,
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
    const response = await fetch(`${this.baseUrl}/api/tags`);

    if (!response.ok) {
      throw new Error(`Failed to list Ollama models: ${response.status}`);
    }

    const json = (await response.json()) as {
      models: Array<{
        name: string;
        size: number;
        details?: { parameter_size?: string };
      }>;
    };

    return json.models.map((m) => ({
      id: `ollama/${m.name}`,
      name: m.name,
      contextLength: 8192, // Ollama doesn't expose this; use safe default
    }));
  }

  async verify(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      return response.ok;
    } catch {
      return false;
    }
  }
}
