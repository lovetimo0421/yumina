import type { WorldEntry, Condition, GameState } from "../types/index.js";

/** Rough token estimate: 1 token ≈ 4 characters */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export interface LorebookMatchResult {
  /** Entries that always inject (alwaysSend=true), not subject to token budget */
  alwaysSend: WorldEntry[];
  /** Entries matched by keyword/condition, trimmed to fit token budget */
  triggered: WorldEntry[];
  /** Total estimated tokens used by triggered entries */
  triggeredTokens: number;
}

/**
 * Matches world entries against recent messages and game state.
 * Splits results into always-send (unbounded) and triggered (token-budgeted).
 */
export class LorebookMatcher {
  /**
   * Full match with token budgeting.
   * @param entries All entries for this world (filters out greeting/disabled internally)
   * @param recentMessages Recent message texts to scan for keywords
   * @param state Current game state for condition evaluation
   * @param tokenBudget Max tokens for triggered entries (default 2048)
   */
  matchWithBudget(
    entries: WorldEntry[],
    recentMessages: string[],
    state: GameState,
    tokenBudget = 2048
  ): LorebookMatchResult {
    const combinedText = recentMessages.join(" ").toLowerCase();

    const alwaysSend: WorldEntry[] = [];
    const triggered: WorldEntry[] = [];

    for (const entry of entries) {
      if (!entry.enabled) continue;
      // Skip greeting entries — they're not injected via matching
      if (entry.position === "greeting") continue;

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
    const budgeted: WorldEntry[] = [];
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
   */
  match(
    entries: WorldEntry[],
    recentMessages: string[],
    state: GameState
  ): WorldEntry[] {
    const result = this.matchWithBudget(entries, recentMessages, state);
    return [...result.alwaysSend, ...result.triggered];
  }

  checkConditions(
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
