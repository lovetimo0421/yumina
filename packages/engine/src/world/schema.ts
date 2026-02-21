import { z } from "zod";
import { gameComponentSchema as _gameComponentSchema } from "./component-schemas.js";

export const variableSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  type: z.enum(["number", "string", "boolean"]),
  defaultValue: z.union([z.number(), z.string(), z.boolean()]),
  description: z.string().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
});

export const conditionSchema = z.object({
  variableId: z.string(),
  operator: z.enum(["eq", "neq", "gt", "gte", "lt", "lte", "contains"]),
  value: z.union([z.number(), z.string(), z.boolean()]),
});

export const effectSchema = z.object({
  variableId: z.string(),
  operation: z.enum([
    "set",
    "add",
    "subtract",
    "multiply",
    "toggle",
    "append",
  ]),
  value: z.union([z.number(), z.string(), z.boolean()]),
});

export const audioTrackSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  type: z.enum(["bgm", "sfx", "ambient"]),
  url: z.string(),
  loop: z.boolean().optional(),
  volume: z.number().min(0).max(1).optional(),
  fadeIn: z.number().optional(),
  fadeOut: z.number().optional(),
});

export const audioEffectSchema = z.object({
  trackId: z.string(),
  action: z.enum(["play", "stop", "crossfade", "volume"]),
  volume: z.number().min(0).max(1).optional(),
  fadeDuration: z.number().optional(),
});

export const ruleSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string().optional(),
  conditions: z.array(conditionSchema),
  conditionLogic: z.enum(["all", "any"]),
  effects: z.array(effectSchema),
  audioEffects: z.array(audioEffectSchema).optional(),
  priority: z.number().int().default(0),
});

/** @deprecated Use worldEntrySchema instead */
export const characterSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string(),
  systemPrompt: z.string(),
  avatar: z.string().optional(),
  variables: z.array(variableSchema),
});

export { gameComponentSchema } from "./component-schemas.js";

/** @deprecated Use worldEntrySchema instead */
export const lorebookEntrySchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  type: z.enum(["character", "lore", "plot", "style", "custom"]),
  content: z.string(),
  keywords: z.array(z.string()).default([]),
  conditions: z.array(conditionSchema).default([]),
  conditionLogic: z.enum(["all", "any"]).default("all"),
  priority: z.number().int().default(0),
  position: z.enum(["before", "after"]).default("after"),
  enabled: z.boolean().default(true),
  alwaysSend: z.boolean().default(false),
});

export const worldEntrySchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  content: z.string(),
  role: z.enum(["system", "character", "personality", "scenario", "lore", "plot", "style", "example", "greeting", "custom"]),
  position: z.enum(["top", "before_char", "character", "after_char", "persona", "bottom", "depth", "greeting", "post_history"]),
  depth: z.number().int().optional(),
  alwaysSend: z.boolean().default(false),
  keywords: z.array(z.string()).default([]),
  conditions: z.array(conditionSchema).default([]),
  conditionLogic: z.enum(["all", "any"]).default("all"),
  priority: z.number().int().default(0),
  enabled: z.boolean().default(true),
  matchWholeWords: z.boolean().optional().default(false),
  useFuzzyMatch: z.boolean().optional().default(false),
  secondaryKeywords: z.array(z.string()).optional().default([]),
  secondaryKeywordLogic: z.enum(["AND_ANY", "AND_ALL", "NOT_ANY", "NOT_ALL"]).optional().default("AND_ANY"),
  preventRecursion: z.boolean().optional().default(false),
  excludeRecursion: z.boolean().optional().default(false),
});

export const displayTransformSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  pattern: z.string().min(1),
  replacement: z.string(),
  flags: z.string().optional().default("g"),
  order: z.number().int().default(0),
  enabled: z.boolean().default(true),
});

export const customComponentSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  tsxCode: z.string(),
  description: z.string().default(""),
  order: z.number().int().default(0),
  visible: z.boolean().default(true),
  updatedAt: z.string().default(() => new Date().toISOString()),
});

export const worldSettingsSchema = z.object({
  maxTokens: z.number().int().positive().default(12000),
  maxContext: z.number().int().positive().optional().default(200000),
  temperature: z.number().min(0).max(2).default(1.0),
  topP: z.number().min(0).max(1).optional(),
  frequencyPenalty: z.number().min(-2).max(2).optional(),
  presencePenalty: z.number().min(-2).max(2).optional(),
  topK: z.number().int().min(0).optional(),
  minP: z.number().min(0).max(1).optional(),
  playerName: z.string().optional().default("User"),
  systemPrompt: z.string().optional(),
  greeting: z.string().optional(),
  structuredOutput: z.boolean().optional().default(false),
  lorebookTokenBudget: z.number().int().positive().optional(),
  lorebookBudgetPercent: z.number().min(0).max(100).optional().default(100),
  lorebookBudgetCap: z.number().int().min(0).optional().default(0),
  lorebookScanDepth: z.number().int().positive().optional().default(2),
  lorebookRecursionDepth: z.number().int().min(0).max(10).optional().default(0),
  layoutMode: z.enum(["split", "game-focus", "immersive"]).optional().default("split"),
});

export const worldDefinitionSchema = z.object({
  id: z.string(),
  version: z.string().default("1.0.0"),
  name: z.string().min(1),
  description: z.string(),
  author: z.string(),
  avatar: z.string().optional(),
  entries: z.array(worldEntrySchema).default([]),
  variables: z.array(variableSchema).default([]),
  rules: z.array(ruleSchema).default([]),
  characters: z.array(characterSchema).optional(),
  components: z.array(_gameComponentSchema).default([]),
  audioTracks: z.array(audioTrackSchema).default([]),
  lorebookEntries: z.array(lorebookEntrySchema).optional(),
  customComponents: z.array(customComponentSchema).default([]),
  displayTransforms: z.array(displayTransformSchema).default([]),
  settings: worldSettingsSchema,
});

export const gameStateSchema = z.object({
  worldId: z.string(),
  variables: z.record(z.union([z.number(), z.string(), z.boolean()])),
  activeCharacterId: z.string().nullable().optional(),
  turnCount: z.number().int().nonnegative(),
  metadata: z.record(z.unknown()),
});
