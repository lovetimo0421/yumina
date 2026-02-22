import type { GameState, Rule, Effect, Condition, AudioEffect, Variable } from "../types/index.js";

export interface RuleEvalResult {
  effects: Effect[];
  audioEffects: AudioEffect[];
}

export interface ActionRuleResult {
  effects: Effect[];
  audioEffects: AudioEffect[];
  shouldNotify: boolean;
  notificationMessage: string | null;
}

/**
 * Evaluates rules against current game state and returns effects to apply.
 * Pure function — no mutation, no side effects.
 */
export class RulesEngine {
  /**
   * Evaluate condition-triggered rules (existing behavior).
   */
  evaluate(state: GameState, rules: Rule[]): RuleEvalResult {
    // Only evaluate condition-triggered rules (default behavior)
    const conditionRules = rules.filter((r) => !r.trigger || r.trigger === "condition");
    const sorted = [...conditionRules].sort((a, b) => b.priority - a.priority);
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

  /**
   * Evaluate action-triggered rules for a specific actionId.
   * Returns effects + notification info for the two-loop architecture.
   */
  evaluateAction(
    actionId: string,
    state: GameState,
    rules: Rule[],
    variables: Variable[]
  ): ActionRuleResult {
    const actionRules = rules
      .filter((r) => r.trigger === "action" && r.actionId === actionId)
      .sort((a, b) => b.priority - a.priority);

    const effects: Effect[] = [];
    const audioEffects: AudioEffect[] = [];
    let shouldNotify = false;
    let notificationMessage: string | null = null;

    for (const rule of actionRules) {
      // Check optional pre-conditions
      if (!this.checkConditions(state, rule.conditions, rule.conditionLogic)) {
        continue;
      }

      effects.push(...rule.effects);
      if (rule.audioEffects) {
        audioEffects.push(...rule.audioEffects);
      }

      // Determine notification
      const mode = rule.notification ?? "silent";
      if (mode === "always" && rule.notificationTemplate) {
        shouldNotify = true;
        notificationMessage = this.interpolateTemplate(
          rule.notificationTemplate,
          state,
          variables
        );
      } else if (mode === "conditional" && rule.notificationTemplate && rule.notificationConditions) {
        // Apply effects to a snapshot first, then check notification conditions
        const snapshot = this.applyEffectsToSnapshot(state, effects, variables);
        if (this.checkConditions(snapshot, rule.notificationConditions, "all")) {
          shouldNotify = true;
          notificationMessage = this.interpolateTemplate(
            rule.notificationTemplate,
            snapshot,
            variables
          );
        }
      }
    }

    return { effects, audioEffects, shouldNotify, notificationMessage };
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

  /**
   * Interpolate {varId} and {varName} placeholders in a template string.
   */
  private interpolateTemplate(
    template: string,
    state: GameState,
    variables: Variable[]
  ): string {
    const nameToId = new Map(variables.map((v) => [v.name.toLowerCase(), v.id]));
    return template.replace(/\{(\w+)\}/g, (_match, key: string) => {
      // Try direct variable ID first
      if (state.variables[key] !== undefined) {
        return String(state.variables[key]);
      }
      // Try matching by variable name (case-insensitive)
      const idFromName = nameToId.get(key.toLowerCase());
      if (idFromName && state.variables[idFromName] !== undefined) {
        return String(state.variables[idFromName]);
      }
      return `{${key}}`;
    });
  }

  /**
   * Apply effects to a copy of the state (for conditional notification checks).
   */
  private applyEffectsToSnapshot(
    state: GameState,
    effects: Effect[],
    variables: Variable[]
  ): GameState {
    const varMap = new Map(variables.map((v) => [v.id, v]));
    const snapshot: GameState = {
      ...state,
      variables: { ...state.variables },
    };

    for (const effect of effects) {
      const variable = varMap.get(effect.variableId);
      if (!variable) continue;

      const oldValue = snapshot.variables[effect.variableId];
      if (oldValue === undefined) continue;

      let newValue: number | string | boolean;
      switch (effect.operation) {
        case "set":
          newValue = effect.value;
          break;
        case "add":
          newValue = typeof oldValue === "number" && typeof effect.value === "number"
            ? oldValue + effect.value : oldValue;
          break;
        case "subtract":
          newValue = typeof oldValue === "number" && typeof effect.value === "number"
            ? oldValue - effect.value : oldValue;
          break;
        case "multiply":
          newValue = typeof oldValue === "number" && typeof effect.value === "number"
            ? oldValue * effect.value : oldValue;
          break;
        case "toggle":
          newValue = typeof oldValue === "boolean" ? !oldValue : oldValue;
          break;
        case "append":
          newValue = typeof oldValue === "string" && typeof effect.value === "string"
            ? oldValue + effect.value : oldValue;
          break;
        default:
          continue;
      }

      // Apply min/max clamping
      if (variable.type === "number" && typeof newValue === "number") {
        if (variable.min !== undefined) newValue = Math.max(variable.min, newValue);
        if (variable.max !== undefined) newValue = Math.min(variable.max, newValue);
      }

      snapshot.variables[effect.variableId] = newValue;
    }

    return snapshot;
  }
}
