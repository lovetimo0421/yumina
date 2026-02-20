import { z } from "zod";

// ── Per-type config schemas ──

export const statBarConfigSchema = z.object({
  variableId: z.string(),
  color: z.string().optional(),
  showValue: z.boolean().optional(),
  showLabel: z.boolean().optional(),
  secondaryVariableId: z.string().optional(),
});

export const textDisplayConfigSchema = z.object({
  variableId: z.string(),
  format: z.string().optional(),
  fontSize: z.enum(["sm", "md", "lg"]).optional(),
  icon: z.string().optional(),
});

export const choiceListConfigSchema = z.object({
  variableId: z.string(),
  maxChoices: z.number().int().positive().optional(),
  style: z.enum(["buttons", "list"]).optional(),
});

export const imagePanelConfigSchema = z.object({
  variableId: z.string(),
  aspectRatio: z.enum(["square", "portrait", "landscape", "wide"]).optional(),
  fallbackUrl: z.string().optional(),
});

export const inventoryGridConfigSchema = z.object({
  variableId: z.string(),
  columns: z.number().int().positive().optional(),
  maxSlots: z.number().int().positive().optional(),
});

export const toggleSwitchConfigSchema = z.object({
  variableId: z.string(),
  onLabel: z.string().optional(),
  offLabel: z.string().optional(),
  color: z.string().optional(),
});

// ── Base fields shared by all components ──

const baseComponentFields = {
  id: z.string(),
  name: z.string().min(1),
  order: z.number().int().default(0),
  visible: z.boolean().optional(),
};

// ── Per-type component schemas ──

const statBarComponentSchema = z.object({
  ...baseComponentFields,
  type: z.literal("stat-bar"),
  config: statBarConfigSchema,
});

const textDisplayComponentSchema = z.object({
  ...baseComponentFields,
  type: z.literal("text-display"),
  config: textDisplayConfigSchema,
});

const choiceListComponentSchema = z.object({
  ...baseComponentFields,
  type: z.literal("choice-list"),
  config: choiceListConfigSchema,
});

const imagePanelComponentSchema = z.object({
  ...baseComponentFields,
  type: z.literal("image-panel"),
  config: imagePanelConfigSchema,
});

const inventoryGridComponentSchema = z.object({
  ...baseComponentFields,
  type: z.literal("inventory-grid"),
  config: inventoryGridConfigSchema,
});

const toggleSwitchComponentSchema = z.object({
  ...baseComponentFields,
  type: z.literal("toggle-switch"),
  config: toggleSwitchConfigSchema,
});

// ── Discriminated union schema ──

export const gameComponentSchema = z.discriminatedUnion("type", [
  statBarComponentSchema,
  textDisplayComponentSchema,
  choiceListComponentSchema,
  imagePanelComponentSchema,
  inventoryGridComponentSchema,
  toggleSwitchComponentSchema,
]);
