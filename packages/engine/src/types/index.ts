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

/** An audio track that can be played during gameplay */
export interface AudioTrack {
  id: string;
  name: string;
  type: "bgm" | "sfx" | "ambient";
  url: string;
  loop?: boolean;
  volume?: number;
  fadeIn?: number;
  fadeOut?: number;
}

/** An audio effect triggered by rules or AI responses */
export interface AudioEffect {
  trackId: string;
  action: "play" | "stop" | "crossfade" | "volume";
  volume?: number;
  fadeDuration?: number;
}

/** A rule that triggers effects when conditions are met */
export interface Rule {
  id: string;
  name: string;
  description?: string;
  conditions: Condition[];
  conditionLogic: "all" | "any";
  effects: Effect[];
  audioEffects?: AudioEffect[];
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

// Re-export component types
export type {
  ComponentType,
  GameComponent,
  StatBarComponent,
  TextDisplayComponent,
  ChoiceListComponent,
  ImagePanelComponent,
  InventoryGridComponent,
  ToggleSwitchComponent,
  StatBarConfig,
  TextDisplayConfig,
  ChoiceListConfig,
  ImagePanelConfig,
  InventoryGridConfig,
  ToggleSwitchConfig,
  ComponentTypeMeta,
} from "./components.js";

export { COMPONENT_TYPE_META } from "./components.js";

/** A lorebook entry for contextual prompt injection */
export interface LorebookEntry {
  id: string;
  name: string;
  type: "character" | "lore" | "plot" | "style" | "custom";
  content: string;
  keywords: string[];
  conditions: Condition[];
  conditionLogic: "all" | "any";
  priority: number;
  position: "before" | "after";
  enabled: boolean;
  /** Always inject this entry regardless of keyword/condition triggers */
  alwaysSend: boolean;
}

/** A custom TSX component created by the AI or user */
export interface CustomComponent {
  id: string;
  name: string;
  tsxCode: string;
  description: string;
  order: number;
  visible: boolean;
  updatedAt: string;
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
  components: import("./components.js").GameComponent[];
  audioTracks: AudioTrack[];
  lorebookEntries: LorebookEntry[];
  customComponents: CustomComponent[];
  settings: WorldSettings;
}

/** World-level settings */
export interface WorldSettings {
  maxTokens: number;
  temperature: number;
  systemPrompt: string;
  greeting: string;
  /** Enable JSON structured output mode (default false, uses regex parsing) */
  structuredOutput?: boolean;
  /** Max total tokens for triggered lorebook entries (default 2048) */
  lorebookTokenBudget?: number;
  /** Number of recent messages to scan for keyword matches (default 10) */
  lorebookScanDepth?: number;
}

/** Runtime game state during a play session */
export interface GameState {
  worldId: string;
  variables: Record<string, number | string | boolean>;
  activeCharacterId: string | null;
  turnCount: number;
  metadata: Record<string, unknown>;
}
