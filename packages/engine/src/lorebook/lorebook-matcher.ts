import type { LorebookEntry, Condition, GameState } from "../types/index.js";

/** Rough token estimate: 1 token ≈ 4 characters */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export interface LorebookMatchResult {
  /** Entries that always inject (alwaysSend=true), not subject to token budget */
  alwaysSend: LorebookEntry[];
  /** Entries matched by keyword/condition, trimmed to fit token budget */
  triggered: LorebookEntry[];
  /** Total estimated tokens used by triggered entries */
  triggeredTokens: number;
}

/**
 * Matches lorebook entries against recent messages and game state.
 * Splits results into always-send (unbounded) and triggered (token-budgeted).
 */
export class LorebookMatcher {
  /**
   * Full match with token budgeting.
   * @param entries All lorebook entries for this world
   * @param recentMessages Recent message texts to scan for keywords
   * @param state Current game state for condition evaluation
   * @param tokenBudget Max tokens for triggered entries (default 2048)
   */
  matchWithBudget(
    entries: LorebookEntry[],
    recentMessages: string[],
    state: GameState,
    tokenBudget = 2048
  ): LorebookMatchResult {
    const combinedText = recentMessages.join(" ").toLowerCase();

    const alwaysSend: LorebookEntry[] = [];
    const triggered: LorebookEntry[] = [];

    for (const entry of entries) {
      if (!entry.enabled) continue;

      // Always-send entries bypass keyword/condition checks
      if (entry.alwaysSend) {
        alwaysSend.push(entry);
        continue;
      }

      // Keyword matching
      const keywordMatch =
        entry.keywords.length === 0 ||
        entry.keywords.some((kw) => combinedText.includes(kw.toLowerCase()));

      if (!keywordMatch) continue;

      // Condition check
      if (
        entry.conditions.length > 0 &&
        !this.checkConditions(state, entry.conditions, entry.conditionLogic)
      ) {
        continue;
      }

      triggered.push(entry);
    }

    // Sort triggered by priority (highest first)
    triggered.sort((a, b) => b.priority - a.priority);

    // Apply token budget — fill from highest priority down
    const budgeted: LorebookEntry[] = [];
    let usedTokens = 0;

    for (const entry of triggered) {
      const entryTokens = estimateTokens(entry.content);
      if (usedTokens + entryTokens > tokenBudget && budgeted.length > 0) {
        break;
      }
      budgeted.push(entry);
      usedTokens += entryTokens;
    }

    return {
      alwaysSend,
      triggered: budgeted,
      triggeredTokens: usedTokens,
    };
  }

  /**
   * Legacy match method — returns flat array (always-send + triggered combined).
   * Used for backwards compatibility with existing callers.
   */
  match(
    entries: LorebookEntry[],
    recentMessages: string[],
    state: GameState
  ): LorebookEntry[] {
    const result = this.matchWithBudget(entries, recentMessages, state);
    return [...result.alwaysSend, ...result.triggered];
  }

  private checkConditions(
    state: GameState,
    conditions: Condition[],
    logic: "all" | "any"
  ): boolean {
    if (conditions.length === 0) return true;

    if (logic === "all") {
      return conditions.every((c) => this.evaluateCondition(state, c));
    }
    return conditions.some((c) => this.evaluateCondition(state, c));
  }

  private evaluateCondition(state: GameState, condition: Condition): boolean {
    const current = state.variables[condition.variableId];
    if (current === undefined) return false;

    const target = condition.value;

    switch (condition.operator) {
      case "eq":
        return current === target;
      case "neq":
        return current !== target;
      case "gt":
        return typeof current === "number" && typeof target === "number"
          ? current > target
          : false;
      case "gte":
        return typeof current === "number" && typeof target === "number"
          ? current >= target
          : false;
      case "lt":
        return typeof current === "number" && typeof target === "number"
          ? current < target
          : false;
      case "lte":
        return typeof current === "number" && typeof target === "number"
          ? current <= target
          : false;
      case "contains":
        return typeof current === "string" && typeof target === "string"
          ? current.includes(target)
          : false;
      default:
        return false;
    }
  }
}
