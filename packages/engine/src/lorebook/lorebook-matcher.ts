import type { LorebookEntry, Condition, GameState } from "../types/index.js";

/**
 * Matches lorebook entries against recent messages and game state.
 * Reuses the same condition evaluation logic as RulesEngine.
 */
export class LorebookMatcher {
  match(
    entries: LorebookEntry[],
    recentMessages: string[],
    state: GameState
  ): LorebookEntry[] {
    const combinedText = recentMessages.join(" ").toLowerCase();

    const matched = entries.filter((entry) => {
      if (!entry.enabled) return false;

      const keywordMatch =
        entry.keywords.length === 0 ||
        entry.keywords.some((kw) => combinedText.includes(kw.toLowerCase()));

      if (!keywordMatch) return false;

      if (entry.conditions.length === 0) return true;

      return this.checkConditions(
        state,
        entry.conditions,
        entry.conditionLogic
      );
    });

    return matched.sort((a, b) => b.priority - a.priority);
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
