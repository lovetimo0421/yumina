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

export const characterSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string(),
  systemPrompt: z.string(),
  avatar: z.string().optional(),
  variables: z.array(variableSchema),
});

export { gameComponentSchema } from "./component-schemas.js";

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
  maxTokens: z.number().int().positive().default(2048),
  temperature: z.number().min(0).max(2).default(0.8),
  systemPrompt: z.string().default(""),
  greeting: z.string().default(""),
  structuredOutput: z.boolean().optional().default(false),
  lorebookTokenBudget: z.number().int().positive().optional().default(2048),
  lorebookScanDepth: z.number().int().positive().optional().default(10),
});

export const worldDefinitionSchema = z.object({
  id: z.string(),
  version: z.string().default("1.0.0"),
  name: z.string().min(1),
  description: z.string(),
  author: z.string(),
  variables: z.array(variableSchema).default([]),
  rules: z.array(ruleSchema).default([]),
  characters: z.array(characterSchema).default([]),
  components: z.array(_gameComponentSchema).default([]),
  audioTracks: z.array(audioTrackSchema).default([]),
  lorebookEntries: z.array(lorebookEntrySchema).default([]),
  customComponents: z.array(customComponentSchema).default([]),
  settings: worldSettingsSchema,
});

export const gameStateSchema = z.object({
  worldId: z.string(),
  variables: z.record(z.union([z.number(), z.string(), z.boolean()])),
  activeCharacterId: z.string().nullable(),
  turnCount: z.number().int().nonnegative(),
  metadata: z.record(z.unknown()),
});
