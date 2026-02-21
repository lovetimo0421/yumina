// Types
export type {
  Variable,
  Condition,
  Rule,
  Effect,
  Character,
  WorldDefinition,
  WorldSettings,
  GameState,
  AudioTrack,
  AudioEffect,
  LorebookEntry,
  WorldEntry,
  CustomComponent,
  DisplayTransform,
} from "./types/index.js";

// Component types
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
} from "./types/index.js";

export { COMPONENT_TYPE_META } from "./types/index.js";

// Schemas
export {
  variableSchema,
  conditionSchema,
  effectSchema,
  ruleSchema,
  characterSchema,
  gameComponentSchema,
  worldSettingsSchema,
  worldDefinitionSchema,
  gameStateSchema,
  audioTrackSchema,
  audioEffectSchema,
  lorebookEntrySchema,
  worldEntrySchema,
  customComponentSchema,
  displayTransformSchema,
} from "./world/schema.js";

// State
export { GameStateManager } from "./state/game-state-manager.js";

// Rules
export { RulesEngine } from "./rules/rules-engine.js";
export type { RuleEvalResult } from "./rules/rules-engine.js";

// Prompts
export { PromptBuilder } from "./prompts/prompt-builder.js";
export type { ChatMessage } from "./prompts/prompt-builder.js";

// Components
export { resolveComponents } from "./components/index.js";
export type {
  ResolvedComponent,
  ResolvedStatBar,
  ResolvedTextDisplay,
  ResolvedChoiceList,
  ResolvedImagePanel,
  ResolvedInventoryGrid,
  ResolvedToggleSwitch,
  ResolvedForm,
  ResolvedError,
} from "./components/index.js";

// Lorebook
export { LorebookMatcher } from "./lorebook/lorebook-matcher.js";
export type { LorebookMatchResult } from "./lorebook/lorebook-matcher.js";
export { levenshteinDistance, fuzzyMatch } from "./lorebook/levenshtein.js";
export { keywordMatches } from "./lorebook/keyword-matcher.js";

// Parser
export { ResponseParser } from "./parser/response-parser.js";
export type { ParseResult } from "./parser/response-parser.js";
export { StructuredResponseParser } from "./parser/structured-response-parser.js";
export type {
  StructuredParseResult,
  StructuredResponse,
} from "./parser/structured-response-parser.js";

// Migration
export { migrateWorldDefinition } from "./migration/migrate-v1-to-v2.js";

// Import
export { importSillyTavernCard } from "./import/st-card-importer.js";
