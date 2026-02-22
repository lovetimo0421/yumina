import type {
  WorldDefinition,
  GameState,
  WorldEntry,
  Variable,
  VariableCategory,
} from "../types/index.js";
import { expandMacros } from "./macros.js";
import { estimateTokens } from "./token-utils.js";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

/**
 * Position slots in prompt assembly order.
 * Maps to SillyTavern's story_string:
 *   top         = main prompt + anchorBefore
 *   before_char = wiBefore
 *   character   = charDescription + charPersonality
 *   after_char  = scenario + wiAfter
 *   persona     = personaDescription
 *   bottom      = anchorAfter + format instructions
 *
 * Not in system prompt (handled separately):
 *   depth       = injected N messages from end in chat history
 *   greeting    = first assistant message
 *   post_history = jailbreak / post-history instructions (after all chat)
 */
const POSITION_ORDER: WorldEntry["position"][] = [
  "top",
  "before_char",
  "character",
  "after_char",
  "persona",
  "bottom",
];

/**
 * Composes LLM prompts from world definition + current state.
 * Uses the unified WorldEntry[] model — entries are grouped by position slot,
 * sorted by priority DESC within each slot, and concatenated.
 */
export class PromptBuilder {
  /**
   * Build the system prompt from world entries.
   * @param world The world definition with entries[]
   * @param state Current game state
   * @param matchedEntries Triggered entries from the matcher (keyword/vector matched)
   */
  buildSystemPrompt(
    world: WorldDefinition,
    state: GameState,
    matchedEntries?: WorldEntry[]
  ): string {
    const entries = this.collectEntries(world, matchedEntries);
    return this.assemblePrompt(world, state, entries, false);
  }

  /**
   * Build system prompt for structured (JSON) output mode.
   */
  buildStructuredSystemPrompt(
    world: WorldDefinition,
    state: GameState,
    matchedEntries?: WorldEntry[]
  ): string {
    const entries = this.collectEntries(world, matchedEntries);
    return this.assemblePrompt(world, state, entries, true);
  }

  /**
   * Find and interpolate the greeting entry.
   */
  buildGreeting(world: WorldDefinition, state: GameState): string {
    const greetingEntry = world.entries.find(
      (e) => e.position === "greeting" && e.enabled
    );
    if (!greetingEntry) return "";
    return this.interpolate(greetingEntry.content, world, state);
  }

  /**
   * Get depth entries for in-chat injection.
   * Returns entries with their depth value for the message router to place.
   */
  buildDepthEntries(
    world: WorldDefinition,
    state: GameState,
    matchedEntries?: WorldEntry[]
  ): { content: string; depth: number }[] {
    const allEntries = this.collectEntries(world, matchedEntries);
    return allEntries
      .filter((e) => e.position === "depth" && e.depth !== undefined)
      .sort((a, b) => b.priority - a.priority)
      .map((e) => ({
        content: this.interpolate(e.content, world, state),
        depth: e.depth!,
      }));
  }

  /**
   * Get post-history entries (jailbreak / post-history instructions).
   * These go AFTER all chat history as the final system message before AI responds.
   */
  buildPostHistoryEntries(
    world: WorldDefinition,
    state: GameState,
    matchedEntries?: WorldEntry[]
  ): string[] {
    const allEntries = this.collectEntries(world, matchedEntries);
    return allEntries
      .filter((e) => e.position === "post_history")
      .sort((a, b) => b.priority - a.priority)
      .map((e) => this.interpolate(e.content, world, state));
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

  /**
   * Collect all relevant entries: alwaysSend + matched.
   * Includes all positions — callers filter by position as needed.
   */
  private collectEntries(
    world: WorldDefinition,
    matchedEntries?: WorldEntry[]
  ): WorldEntry[] {
    const alwaysSend = world.entries.filter(
      (e) =>
        e.enabled &&
        e.alwaysSend &&
        e.position !== "greeting"
    );

    // Merge matched entries (deduplicate by id)
    const seenIds = new Set(alwaysSend.map((e) => e.id));
    const matched = (matchedEntries ?? []).filter(
      (e) =>
        e.enabled &&
        e.position !== "greeting" &&
        !seenIds.has(e.id)
    );

    return [...alwaysSend, ...matched];
  }

  /**
   * Assemble the final prompt string from collected entries.
   */
  private assemblePrompt(
    world: WorldDefinition,
    state: GameState,
    entries: WorldEntry[],
    structured: boolean
  ): string {
    const parts: string[] = [];

    // Group entries by position, then sort by priority DESC within each group
    for (const position of POSITION_ORDER) {
      const slotEntries = entries
        .filter((e) => e.position === position)
        .sort((a, b) => b.priority - a.priority);

      for (const entry of slotEntries) {
        parts.push(this.interpolate(entry.content, world, state));
      }
    }

    // After all user content: variable summary + directives + audio
    const varSummary = this.buildVariableSummary(world, state);
    if (varSummary) {
      parts.push(`Current game state:\n${varSummary}`);
    }

    if (structured) {
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
          .map((v) => {
            const desc = v.description || v.name;
            const hint = v.updateHints ? ` — ${v.updateHints}` : "";
            return `  - ${v.id} (${v.type}): ${desc}${hint}`;
          })
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
    } else {
      // Regex mode directives
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
    }

    return parts.join("\n\n");
  }

  private interpolate(template: string, world: WorldDefinition, state: GameState): string {
    return expandMacros(template, world, state);
  }

  private buildVariableSummary(
    world: WorldDefinition,
    state: GameState
  ): string {
    if (world.variables.length === 0) return "";

    const CATEGORY_LABELS: Record<VariableCategory, string> = {
      stat: "Stats",
      inventory: "Inventory",
      resource: "Resources",
      flag: "Flags",
      relationship: "Relationships",
      custom: "Custom",
    };

    // Check if any variable has a category
    const hasCategories = world.variables.some((v) => v.category);

    if (!hasCategories) {
      // Simple flat list for backward compat
      return world.variables
        .map((v) => this.formatVariableLine(v, state))
        .join("\n");
    }

    // Group by category
    const groups = new Map<string, Variable[]>();
    for (const v of world.variables) {
      const key = v.category ?? "other";
      const group = groups.get(key) ?? [];
      group.push(v);
      groups.set(key, group);
    }

    // Ordered category keys: known categories first, then "other"
    const categoryOrder: string[] = ["stat", "inventory", "resource", "flag", "relationship", "custom", "other"];
    const sortedKeys = [...groups.keys()].sort(
      (a, b) => categoryOrder.indexOf(a) - categoryOrder.indexOf(b)
    );

    const parts: string[] = [];
    for (const key of sortedKeys) {
      const vars = groups.get(key)!;
      const label = key === "other" ? "Other" : CATEGORY_LABELS[key as VariableCategory] ?? key;
      parts.push(`${label}:`);
      for (const v of vars) {
        parts.push(this.formatVariableLine(v, state));
      }
    }

    return parts.join("\n");
  }

  private formatVariableLine(v: Variable, state: GameState): string {
    const value = state.variables[v.id] ?? v.defaultValue;
    const hints: string[] = [];
    if (v.description) hints.push(v.description);
    if (v.updateHints) hints.push(v.updateHints);
    const suffix = hints.length > 0 ? ` (${hints.join(". ")})` : "";
    return `- ${v.name}: ${value}${suffix}`;
  }

  /**
   * Build a static cost breakdown of the world's prompt.
   * Only includes always-send + enabled entries (no matched entries —
   * this is a design-time analysis, not a runtime one).
   */
  buildPromptCostBreakdown(
    world: WorldDefinition,
    state: GameState,
    structured = false
  ): PromptCostBreakdown {
    const blocks: PromptCostBlock[] = [];

    // Entries grouped by position
    const alwaysSendEntries = world.entries.filter(
      (e) => e.enabled && e.alwaysSend && e.position !== "greeting"
    );

    for (const position of POSITION_ORDER) {
      const slotEntries = alwaysSendEntries
        .filter((e) => e.position === position)
        .sort((a, b) => b.priority - a.priority);

      for (const entry of slotEntries) {
        const text = this.interpolate(entry.content, world, state);
        blocks.push({
          label: entry.name || `Entry (${position})`,
          category: "entry",
          tokens: estimateTokens(text),
          chars: text.length,
        });
      }
    }

    // Depth entries
    const depthEntries = alwaysSendEntries
      .filter((e) => e.position === "depth")
      .sort((a, b) => b.priority - a.priority);

    for (const entry of depthEntries) {
      const text = this.interpolate(entry.content, world, state);
      blocks.push({
        label: entry.name || "Depth Entry",
        category: "entry",
        tokens: estimateTokens(text),
        chars: text.length,
      });
    }

    // Post-history entries
    const postHistoryEntries = alwaysSendEntries
      .filter((e) => e.position === "post_history")
      .sort((a, b) => b.priority - a.priority);

    for (const entry of postHistoryEntries) {
      const text = this.interpolate(entry.content, world, state);
      blocks.push({
        label: entry.name || "Post-History",
        category: "entry",
        tokens: estimateTokens(text),
        chars: text.length,
      });
    }

    // Variable summary
    const varSummary = this.buildVariableSummary(world, state);
    if (varSummary) {
      const fullText = `Current game state:\n${varSummary}`;
      blocks.push({
        label: "Variable Summary",
        category: "variable-summary",
        tokens: estimateTokens(fullText),
        chars: fullText.length,
      });
    }

    // Format instructions
    const formatText = structured
      ? 'You MUST respond with a JSON object in this exact format:\n' +
        '{\n  "narrative": "...",\n  "stateChanges": [...],\n  "choices": [...]\n}\n\n' +
        'Rules:\n- "narrative" is REQUIRED\n- "stateChanges" is optional\n- "choices" is optional\n- Respond ONLY with the JSON object'
      : "When you want to change game variables, use this format in your response: [variableId: operation value]\n" +
        'Examples: [health: -10], [gold: +50], [location: set "forest"], [hasKey: toggle]';

    blocks.push({
      label: structured ? "JSON Format Instructions" : "Directive Format Instructions",
      category: "format-instructions",
      tokens: estimateTokens(formatText),
      chars: formatText.length,
    });

    // Variable list (structured mode only)
    if (structured && world.variables.length > 0) {
      const varList = world.variables
        .map((v) => {
          const desc = v.description || v.name;
          const hint = v.updateHints ? ` — ${v.updateHints}` : "";
          return `  - ${v.id} (${v.type}): ${desc}${hint}`;
        })
        .join("\n");
      const varListText = `Available variables you can modify:\n${varList}`;
      blocks.push({
        label: "Variable Definitions",
        category: "format-instructions",
        tokens: estimateTokens(varListText),
        chars: varListText.length,
      });
    }

    // Audio instructions
    if (world.audioTracks && world.audioTracks.length > 0) {
      const trackList = world.audioTracks
        .map((t) => `  - ${t.id} (${t.type}): ${t.name}`)
        .join("\n");
      const audioText = `Available audio tracks:\n${trackList}`;
      blocks.push({
        label: "Audio Instructions",
        category: "audio-instructions",
        tokens: estimateTokens(audioText),
        chars: audioText.length,
      });
    }

    const totalTokens = blocks.reduce((sum, b) => sum + b.tokens, 0);
    const totalChars = blocks.reduce((sum, b) => sum + b.chars, 0);

    return { blocks, totalTokens, totalChars };
  }
}

export interface PromptCostBlock {
  label: string;
  category: "entry" | "variable-summary" | "format-instructions" | "audio-instructions";
  tokens: number;
  chars: number;
}

export interface PromptCostBreakdown {
  blocks: PromptCostBlock[];
  totalTokens: number;
  totalChars: number;
}
