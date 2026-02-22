/** Variable category for grouping in prompts and editor */
export type VariableCategory = "stat" | "inventory" | "resource" | "flag" | "relationship" | "custom";

/** A variable in the game state (e.g., health, gold, relationship score) */
export interface Variable {
  id: string;
  name: string;
  type: "number" | "string" | "boolean";
  defaultValue: number | string | boolean;
  description?: string;
  min?: number;
  max?: number;
  category?: VariableCategory;
  /** Hints for the AI on when/how to update this variable */
  updateHints?: string;
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

/** Rule trigger type */
export type RuleTrigger = "condition" | "action";

/** Rule notification mode */
export type RuleNotification = "silent" | "always" | "conditional";

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
  /** How this rule is triggered (default "condition" for backward compat) */
  trigger?: RuleTrigger;
  /** For trigger="action" — the action ID that fires this rule */
  actionId?: string;
  /** Whether to notify the AI when this rule fires (default "silent") */
  notification?: RuleNotification;
  /** Template message sent to AI when notifying, e.g. "User ate {item}. Hunger: {hunger}." */
  notificationTemplate?: string;
  /** For notification="conditional" — conditions that must be met to notify */
  notificationConditions?: Condition[];
}

/** An effect that modifies game state */
export interface Effect {
  variableId: string;
  operation: "set" | "add" | "subtract" | "multiply" | "toggle" | "append";
  value: number | string | boolean;
}

/** @deprecated Use WorldEntry instead */
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
  FormComponent,
  StatBarConfig,
  TextDisplayConfig,
  ChoiceListConfig,
  ImagePanelConfig,
  InventoryGridConfig,
  ToggleSwitchConfig,
  FormConfig,
  FormFieldConfig,
  ComponentTypeMeta,
} from "./components.js";

export { COMPONENT_TYPE_META } from "./components.js";

/** @deprecated Use WorldEntry instead */
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

/** A unified content entry — replaces Character + LorebookEntry */
export interface WorldEntry {
  id: string;
  name: string;
  content: string;
  role: "system" | "character" | "personality" | "scenario" | "lore" | "plot" | "style" | "example" | "greeting" | "custom";
  position: "top" | "before_char" | "character" | "after_char" | "persona" | "bottom" | "depth" | "greeting" | "post_history";
  /** For position="depth" only — number of messages from the end to inject */
  depth?: number;
  alwaysSend: boolean;
  keywords: string[];
  conditions: Condition[];
  conditionLogic: "all" | "any";
  /** Higher priority = placed earlier within position slot */
  priority: number;
  enabled: boolean;
  /** Match keywords as whole words only (default false — substring matching) */
  matchWholeWords?: boolean;
  /** Enable fuzzy matching with Levenshtein distance (default false) */
  useFuzzyMatch?: boolean;
  /** Secondary keywords for AND/NOT logic (default []) */
  secondaryKeywords?: string[];
  /** Logic for secondary keywords (default "AND_ANY") */
  secondaryKeywordLogic?: "AND_ANY" | "AND_ALL" | "NOT_ANY" | "NOT_ALL";
  /** If true, this entry's content won't trigger other entries during recursion (default false) */
  preventRecursion?: boolean;
  /** If true, this entry won't be triggered during recursion scans (default false) */
  excludeRecursion?: boolean;
}

/** A regex display transform applied to message content before rendering */
export interface DisplayTransform {
  id: string;
  name: string;
  /** Regex pattern (applied to raw message text) */
  pattern: string;
  /** Replacement string — can include HTML + $1/$2 captures */
  replacement: string;
  /** Regex flags (default "g") */
  flags?: string;
  /** Lower runs first */
  order: number;
  enabled: boolean;
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
  avatar?: string;
  entries: WorldEntry[];
  variables: Variable[];
  rules: Rule[];
  /** @deprecated Use entries instead */
  characters?: Character[];
  components: import("./components.js").GameComponent[];
  audioTracks: AudioTrack[];
  /** @deprecated Use entries instead */
  lorebookEntries?: LorebookEntry[];
  customComponents: CustomComponent[];
  displayTransforms: DisplayTransform[];
  settings: WorldSettings;
}

/** World-level settings — generation parameters only */
export interface WorldSettings {
  maxTokens: number;
  /** Max context window size for history trimming (default 200000) */
  maxContext?: number;
  temperature: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  topK?: number;
  minP?: number;
  /** Player display name for {{user}} macro (default "User") */
  playerName?: string;
  /** @deprecated Use an entry with role="system" + position="top" */
  systemPrompt?: string;
  /** @deprecated Use an entry with role="greeting" + position="greeting" */
  greeting?: string;
  /** Enable JSON structured output mode (default false, uses regex parsing) */
  structuredOutput?: boolean;
  /** @deprecated Use lorebookBudgetPercent instead */
  lorebookTokenBudget?: number;
  /** @deprecated Token budgets removed — all triggered entries are included */
  lorebookBudgetPercent?: number;
  /** @deprecated Token budgets removed — all triggered entries are included */
  lorebookBudgetCap?: number;
  /** Number of recent messages to scan for keyword matches (default 2) */
  lorebookScanDepth?: number;
  /** Max recursion depth for cascading entry triggers. 0 = disabled (default 0). Range 0-10. */
  lorebookRecursionDepth?: number;
  /** @deprecated Use uiMode instead */
  layoutMode?: "split" | "game-focus" | "immersive";
  /** @deprecated No longer used — layout is automatic based on world content */
  uiMode?: "chat" | "per-reply" | "persistent";
  /** When true, custom components take over the entire screen during play (e.g. Dungeon Delver) */
  fullScreenComponent?: boolean;
}

/** Runtime game state during a play session */
export interface GameState {
  worldId: string;
  variables: Record<string, number | string | boolean>;
  /** @deprecated No longer used — character identity is now an entry */
  activeCharacterId?: string | null;
  turnCount: number;
  metadata: Record<string, unknown>;
}
