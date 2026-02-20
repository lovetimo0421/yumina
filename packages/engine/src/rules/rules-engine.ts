import type { GameState, Rule, Effect, Condition, AudioEffect } from "../types/index.js";

export interface RuleEvalResult {
  effects: Effect[];
  audioEffects: AudioEffect[];
}

/**
 * Evaluates rules against current game state and returns effects to apply.
 * Pure function — no mutation, no side effects.
 */
export class RulesEngine {
  evaluate(state: GameState, rules: Rule[]): RuleEvalResult {
    const sorted = [...rules].sort((a, b) => b.priority - a.priority);
    const effects: Effect[] = [];
    const audioEffects: AudioEffect[] = [];

    for (const rule of sorted) {
      if (this.checkConditions(state, rule.conditions, rule.conditionLogic)) {
        effects.push(...rule.effects);
        if (rule.audioEffects) {
          audioEffects.push(...rule.audioEffects);
        }
      }
    }

    return { effects, audioEffects };
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
