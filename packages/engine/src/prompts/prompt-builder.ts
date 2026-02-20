import type {
  WorldDefinition,
  Character,
  GameState,
  LorebookEntry,
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
    state: GameState,
    matchedEntries?: LorebookEntry[]
  ): string {
    const parts: string[] = [];

    if (world.settings.systemPrompt) {
      parts.push(this.interpolate(world.settings.systemPrompt, state));
    }

    // Inject "before" lorebook entries before character identity
    if (matchedEntries) {
      const before = matchedEntries.filter((e) => e.position === "before");
      for (const entry of before) {
        parts.push(entry.content);
      }
    }

    parts.push(`You are ${character.name}. ${character.description}`);

    if (character.systemPrompt) {
      parts.push(this.interpolate(character.systemPrompt, state));
    }

    // Inject "after" lorebook entries after character system prompt
    if (matchedEntries) {
      const after = matchedEntries.filter((e) => e.position === "after");
      for (const entry of after) {
        parts.push(entry.content);
      }
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

    // Audio instructions
    if (world.audioTracks && world.audioTracks.length > 0) {
      const trackList = world.audioTracks
        .map((t) => `  - ${t.id} (${t.type}): ${t.name}`)
        .join("\n");
      parts.push(
        `Available audio tracks:\n${trackList}\n\n` +
        "To trigger audio, use: [audio: trackId action]\n" +
        "Examples: [audio: battle_bgm play], [audio: tavern_ambient stop]"
      );
    }

    return parts.join("\n\n");
  }

  /**
   * Build system prompt for structured (JSON) output mode.
   * Same context as buildSystemPrompt but instructs the model to respond in JSON format.
   */
  buildStructuredSystemPrompt(
    world: WorldDefinition,
    character: Character,
    state: GameState,
    matchedEntries?: LorebookEntry[]
  ): string {
    const parts: string[] = [];

    if (world.settings.systemPrompt) {
      parts.push(this.interpolate(world.settings.systemPrompt, state));
    }

    // Inject "before" lorebook entries before character identity
    if (matchedEntries) {
      const before = matchedEntries.filter((e) => e.position === "before");
      for (const entry of before) {
        parts.push(entry.content);
      }
    }

    parts.push(`You are ${character.name}. ${character.description}`);

    if (character.systemPrompt) {
      parts.push(this.interpolate(character.systemPrompt, state));
    }

    // Inject "after" lorebook entries after character system prompt
    if (matchedEntries) {
      const after = matchedEntries.filter((e) => e.position === "after");
      for (const entry of after) {
        parts.push(entry.content);
      }
    }

    const varSummary = this.buildVariableSummary(world, state);
    if (varSummary) {
      parts.push(`Current game state:\n${varSummary}`);
    }

    // JSON format instructions
    parts.push(
      'You MUST respond with a JSON object in this exact format:\n' +
      '{\n' +
      '  "narrative": "Your in-character response text here",\n' +
      '  "stateChanges": [{"variableId": "id", "operation": "set|add|subtract|multiply|toggle|append", "value": ...}],\n' +
      '  "choices": ["Choice 1", "Choice 2"]\n' +
      '}\n\n' +
      'Rules:\n' +
      '- "narrative" is REQUIRED — your in-character roleplay response\n' +
      '- "stateChanges" is optional — only include when game variables should change\n' +
      '- "choices" is optional — include when you want to present the player with 2-4 choices\n' +
      '- Respond ONLY with the JSON object, no other text'
    );

    if (world.variables.length > 0) {
      const varList = world.variables
        .map((v) => `  - ${v.id} (${v.type}): ${v.description || v.name}`)
        .join("\n");
      parts.push(`Available variables you can modify:\n${varList}`);
    }

    // Audio track instructions for structured mode
    if (world.audioTracks && world.audioTracks.length > 0) {
      const trackList = world.audioTracks
        .map((t) => `  - ${t.id} (${t.type}): ${t.name}`)
        .join("\n");
      parts.push(
        `Available audio tracks:\n${trackList}\n\n` +
        'Include "audioTriggers" in your JSON to play/stop audio:\n' +
        '  "audioTriggers": [{"trackId": "battle_bgm", "action": "play"}]'
      );
    }

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
