import type { Variable, Effect, GameState, WorldDefinition } from "../types/index.js";

type StateChangeCallback = (
  variableId: string,
  oldValue: number | string | boolean,
  newValue: number | string | boolean
) => void;

/**
 * Reactive game state manager.
 * Manages game variables during play — initialize from a WorldDefinition,
 * read/write variables, apply effects, snapshot/restore, and notify listeners.
 */
export class GameStateManager {
  private state: GameState;
  private variables: Map<string, Variable>;
  private listeners: Set<StateChangeCallback> = new Set();

  constructor(world: WorldDefinition, existingState?: GameState) {
    this.variables = new Map(world.variables.map((v) => [v.id, v]));

    if (existingState) {
      this.state = { ...existingState };
    } else {
      this.state = {
        worldId: world.id,
        variables: Object.fromEntries(
          world.variables.map((v) => [v.id, v.defaultValue])
        ),
        turnCount: 0,
        metadata: {},
      };
    }
  }

  get(variableId: string): number | string | boolean | undefined {
    return this.state.variables[variableId];
  }

  set(variableId: string, value: number | string | boolean): void {
    const variable = this.variables.get(variableId);
    if (!variable) return;

    const validated = this.validateValue(variable, value);
    const oldValue = this.state.variables[variableId];
    if (oldValue === undefined || oldValue === validated) return;

    this.state = {
      ...this.state,
      variables: { ...this.state.variables, [variableId]: validated },
    };

    for (const listener of this.listeners) {
      listener(variableId, oldValue, validated);
    }
  }

  applyEffects(effects: Effect[]): Array<{
    variableId: string;
    oldValue: number | string | boolean;
    newValue: number | string | boolean;
  }> {
    const changes: Array<{
      variableId: string;
      oldValue: number | string | boolean;
      newValue: number | string | boolean;
    }> = [];

    for (const effect of effects) {
      const variable = this.variables.get(effect.variableId);
      if (!variable) continue;

      const oldValue = this.state.variables[effect.variableId];
      if (oldValue === undefined) continue;

      let newValue: number | string | boolean;

      switch (effect.operation) {
        case "set":
          newValue = effect.value;
          break;
        case "add":
          newValue =
            typeof oldValue === "number" && typeof effect.value === "number"
              ? oldValue + effect.value
              : oldValue;
          break;
        case "subtract":
          newValue =
            typeof oldValue === "number" && typeof effect.value === "number"
              ? oldValue - effect.value
              : oldValue;
          break;
        case "multiply":
          newValue =
            typeof oldValue === "number" && typeof effect.value === "number"
              ? oldValue * effect.value
              : oldValue;
          break;
        case "toggle":
          newValue = typeof oldValue === "boolean" ? !oldValue : oldValue;
          break;
        case "append":
          newValue =
            typeof oldValue === "string" && typeof effect.value === "string"
              ? oldValue + effect.value
              : oldValue;
          break;
        default:
          continue;
      }

      const validated = this.validateValue(variable, newValue);
      if (oldValue !== validated) {
        changes.push({
          variableId: effect.variableId,
          oldValue,
          newValue: validated,
        });
      }

      this.state = {
        ...this.state,
        variables: {
          ...this.state.variables,
          [effect.variableId]: validated,
        },
      };
    }

    for (const change of changes) {
      for (const listener of this.listeners) {
        listener(change.variableId, change.oldValue, change.newValue);
      }
    }

    return changes;
  }

  getSnapshot(): GameState {
    return {
      ...this.state,
      variables: { ...this.state.variables },
      metadata: { ...this.state.metadata },
    };
  }

  loadSnapshot(state: GameState): void {
    this.state = {
      ...state,
      variables: { ...state.variables },
      metadata: { ...state.metadata },
    };
  }

  incrementTurn(): void {
    this.state = { ...this.state, turnCount: this.state.turnCount + 1 };
  }

  getMetadata(key: string): unknown {
    return this.state.metadata[key];
  }

  setMetadata(key: string, value: unknown): void {
    this.state = {
      ...this.state,
      metadata: { ...this.state.metadata, [key]: value },
    };
  }

  onChange(callback: StateChangeCallback): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private validateValue(
    variable: Variable,
    value: number | string | boolean
  ): number | string | boolean {
    if (variable.type === "number" && typeof value === "number") {
      let v = value;
      if (variable.min !== undefined) v = Math.max(variable.min, v);
      if (variable.max !== undefined) v = Math.min(variable.max, v);
      return v;
    }
    return value;
  }
}
