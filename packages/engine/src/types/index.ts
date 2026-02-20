/** A variable in the game state (e.g., health, gold, relationship score) */
export interface Variable {
  id: string;
  name: string;
  type: "number" | "string" | "boolean";
  defaultValue: number | string | boolean;
  description?: string;
  min?: number;
  max?: number;
}

/** A condition that checks game state */
export interface Condition {
  variableId: string;
  operator: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "contains";
  value: number | string | boolean;
}

/** A rule that triggers effects when conditions are met */
export interface Rule {
  id: string;
  name: string;
  description?: string;
  conditions: Condition[];
  conditionLogic: "all" | "any";
  effects: Effect[];
  priority: number;
}

/** An effect that modifies game state */
export interface Effect {
  variableId: string;
  operation: "set" | "add" | "subtract" | "multiply" | "toggle" | "append";
  value: number | string | boolean;
}

/** A character in the world */
export interface Character {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  avatar?: string;
  variables: Variable[];
}

/** A component in the world (reusable building block) */
export interface Component {
  id: string;
  type: string;
  name: string;
  config: Record<string, unknown>;
}

/** The full World definition — the complete game package */
export interface WorldDefinition {
  id: string;
  version: string;
  name: string;
  description: string;
  author: string;
  variables: Variable[];
  rules: Rule[];
  characters: Character[];
  components: Component[];
  settings: WorldSettings;
}

/** World-level settings */
export interface WorldSettings {
  maxTokens: number;
  temperature: number;
  systemPrompt: string;
  greeting: string;
}

/** Runtime game state during a play session */
export interface GameState {
  worldId: string;
  variables: Record<string, number | string | boolean>;
  activeCharacterId: string | null;
  turnCount: number;
  metadata: Record<string, unknown>;
}
