import type { LLMProvider } from "./types.js";
import { OpenRouterProvider } from "./openrouter.js";
import { AnthropicProvider } from "./anthropic.js";
import { OpenAIProvider } from "./openai.js";
import { OllamaProvider } from "./ollama.js";

export type ProviderName = "openrouter" | "anthropic" | "openai" | "ollama";

/** Create a provider instance given a provider name and API key (or URL for Ollama). */
export function createProvider(provider: ProviderName, apiKeyOrUrl: string): LLMProvider {
  switch (provider) {
    case "anthropic":
      return new AnthropicProvider(apiKeyOrUrl);
    case "openai":
      return new OpenAIProvider(apiKeyOrUrl);
    case "ollama":
      return new OllamaProvider(apiKeyOrUrl);
    case "openrouter":
    default:
      return new OpenRouterProvider(apiKeyOrUrl);
  }
}

/** Infer provider from model ID prefix. */
export function inferProvider(modelId: string): ProviderName {
  if (modelId.startsWith("anthropic/")) return "anthropic";
  if (modelId.startsWith("openai/")) return "openai";
  if (modelId.startsWith("ollama/")) return "ollama";
  return "openrouter";
}
