import type {
  WorldDefinition,
  Character,
  GameState,
} from "../types/index.js";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

/**
 * Composes LLM prompts from world definition + current state.
 * Handles template variable interpolation and message history formatting.
 */
export class PromptBuilder {
  buildSystemPrompt(
    world: WorldDefinition,
    character: Character,
    state: GameState
  ): string {
    const parts: string[] = [];

    if (world.settings.systemPrompt) {
      parts.push(this.interpolate(world.settings.systemPrompt, state));
    }

    parts.push(`You are ${character.name}. ${character.description}`);

    if (character.systemPrompt) {
      parts.push(this.interpolate(character.systemPrompt, state));
    }

    const varSummary = this.buildVariableSummary(world, state);
    if (varSummary) {
      parts.push(`Current game state:\n${varSummary}`);
    }

    parts.push(
      "When you want to change game variables, use this format in your response: [variableId: operation value]"
    );
    parts.push(
      'Examples: [health: -10], [gold: +50], [location: set "forest"], [hasKey: toggle]'
    );

    return parts.join("\n\n");
  }

  buildMessageHistory(
    messages: ChatMessage[],
    maxTokens?: number
  ): ChatMessage[] {
    if (!maxTokens || messages.length === 0) return [...messages];

    // Rough estimate: 1 token ≈ 4 chars
    const charLimit = maxTokens * 4;
    const result: ChatMessage[] = [];
    let totalChars = 0;

    // Always keep the most recent messages, trim from the oldest
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i]!;
      const msgChars = msg.content.length;
      if (totalChars + msgChars > charLimit && result.length > 0) break;
      totalChars += msgChars;
      result.unshift(msg);
    }

    return result;
  }

  buildGreeting(world: WorldDefinition, state: GameState): string {
    return this.interpolate(world.settings.greeting, state);
  }

  private interpolate(template: string, state: GameState): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_match, varId: string) => {
      const value = state.variables[varId];
      return value !== undefined ? String(value) : `{{${varId}}}`;
    });
  }

  private buildVariableSummary(
    world: WorldDefinition,
    state: GameState
  ): string {
    if (world.variables.length === 0) return "";

    return world.variables
      .map((v) => {
        const value = state.variables[v.id] ?? v.defaultValue;
        return `- ${v.name}: ${value}`;
      })
      .join("\n");
  }
}
