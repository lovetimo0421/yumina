import { z } from "zod";

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

export const ruleSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string().optional(),
  conditions: z.array(conditionSchema),
  conditionLogic: z.enum(["all", "any"]),
  effects: z.array(effectSchema),
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

export const componentSchema = z.object({
  id: z.string(),
  type: z.string(),
  name: z.string().min(1),
  config: z.record(z.unknown()),
});

export const worldSettingsSchema = z.object({
  maxTokens: z.number().int().positive().default(2048),
  temperature: z.number().min(0).max(2).default(0.8),
  systemPrompt: z.string().default(""),
  greeting: z.string().default(""),
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
  components: z.array(componentSchema).default([]),
  settings: worldSettingsSchema,
});

export const gameStateSchema = z.object({
  worldId: z.string(),
  variables: z.record(z.union([z.number(), z.string(), z.boolean()])),
  activeCharacterId: z.string().nullable(),
  turnCount: z.number().int().nonnegative(),
  metadata: z.record(z.unknown()),
});
