import type {
  GameComponent,
  Variable,
  GameState,
} from "../types/index.js";

// ── Resolved component types (render-ready) ──

export interface ResolvedStatBar {
  id: string;
  type: "stat-bar";
  name: string;
  order: number;
  value: number;
  min: number;
  max: number;
  percentage: number;
  color?: string;
  showValue: boolean;
  showLabel: boolean;
}

export interface ResolvedTextDisplay {
  id: string;
  type: "text-display";
  name: string;
  order: number;
  text: string;
  rawValue: string | number | boolean;
  fontSize: "sm" | "md" | "lg";
  icon?: string;
}

export interface ResolvedChoiceList {
  id: string;
  type: "choice-list";
  name: string;
  order: number;
  variableId: string;
  currentValue: string;
  maxChoices: number;
  style: "buttons" | "list";
}

export interface ResolvedImagePanel {
  id: string;
  type: "image-panel";
  name: string;
  order: number;
  imageUrl: string;
  aspectRatio: "square" | "portrait" | "landscape" | "wide";
  fallbackUrl?: string;
}

export interface ResolvedInventoryGrid {
  id: string;
  type: "inventory-grid";
  name: string;
  order: number;
  items: string[];
  columns: number;
  maxSlots: number;
}

export interface ResolvedToggleSwitch {
  id: string;
  type: "toggle-switch";
  name: string;
  order: number;
  value: boolean;
  onLabel: string;
  offLabel: string;
  color?: string;
}

export interface ResolvedError {
  id: string;
  type: "error";
  name: string;
  order: number;
  message: string;
}

export type ResolvedComponent =
  | ResolvedStatBar
  | ResolvedTextDisplay
  | ResolvedChoiceList
  | ResolvedImagePanel
  | ResolvedInventoryGrid
  | ResolvedToggleSwitch
  | ResolvedError;

// ── Resolver ──

/**
 * Resolves GameComponent definitions + current game state into
 * render-ready descriptors the UI can consume directly.
 */
export function resolveComponents(
  components: GameComponent[],
  state: GameState,
  variables: Variable[]
): ResolvedComponent[] {
  const varMap = new Map(variables.map((v) => [v.id, v]));

  return components
    .filter((c) => c.visible !== false)
    .sort((a, b) => a.order - b.order)
    .map((component) => resolveOne(component, state, varMap));
}

function resolveOne(
  component: GameComponent,
  state: GameState,
  varMap: Map<string, Variable>
): ResolvedComponent {
  switch (component.type) {
    case "stat-bar":
      return resolveStatBar(component, state, varMap);
    case "text-display":
      return resolveTextDisplay(component, state, varMap);
    case "choice-list":
      return resolveChoiceList(component, state, varMap);
    case "image-panel":
      return resolveImagePanel(component, state, varMap);
    case "inventory-grid":
      return resolveInventoryGrid(component, state, varMap);
    case "toggle-switch":
      return resolveToggleSwitch(component, state, varMap);
  }
}

function resolveStatBar(
  c: Extract<GameComponent, { type: "stat-bar" }>,
  state: GameState,
  varMap: Map<string, Variable>
): ResolvedStatBar | ResolvedError {
  const variable = varMap.get(c.config.variableId);
  if (!variable) {
    return makeError(c, `Variable "${c.config.variableId}" not found`);
  }

  const rawValue = state.variables[c.config.variableId];
  const value = typeof rawValue === "number" ? rawValue : Number(rawValue) || 0;

  // Max can come from a secondary variable or the variable definition
  let max = variable.max ?? 100;
  if (c.config.secondaryVariableId) {
    const secVal = state.variables[c.config.secondaryVariableId];
    if (typeof secVal === "number") max = secVal;
  }
  const min = variable.min ?? 0;
  const range = max - min;
  const percentage = range > 0
    ? Math.max(0, Math.min(100, ((value - min) / range) * 100))
    : 0;

  return {
    id: c.id,
    type: "stat-bar",
    name: c.name,
    order: c.order,
    value,
    min,
    max,
    percentage,
    color: c.config.color,
    showValue: c.config.showValue ?? true,
    showLabel: c.config.showLabel ?? true,
  };
}

function resolveTextDisplay(
  c: Extract<GameComponent, { type: "text-display" }>,
  state: GameState,
  varMap: Map<string, Variable>
): ResolvedTextDisplay | ResolvedError {
  const variable = varMap.get(c.config.variableId);
  if (!variable) {
    return makeError(c, `Variable "${c.config.variableId}" not found`);
  }

  const rawValue = state.variables[c.config.variableId] ?? variable.defaultValue;
  const text = c.config.format
    ? c.config.format.replace(/\{\{value\}\}/g, String(rawValue))
    : String(rawValue);

  return {
    id: c.id,
    type: "text-display",
    name: c.name,
    order: c.order,
    text,
    rawValue,
    fontSize: c.config.fontSize ?? "md",
    icon: c.config.icon,
  };
}

function resolveChoiceList(
  c: Extract<GameComponent, { type: "choice-list" }>,
  state: GameState,
  varMap: Map<string, Variable>
): ResolvedChoiceList | ResolvedError {
  const variable = varMap.get(c.config.variableId);
  if (!variable) {
    return makeError(c, `Variable "${c.config.variableId}" not found`);
  }

  const currentValue = String(state.variables[c.config.variableId] ?? "");

  return {
    id: c.id,
    type: "choice-list",
    name: c.name,
    order: c.order,
    variableId: c.config.variableId,
    currentValue,
    maxChoices: c.config.maxChoices ?? 4,
    style: c.config.style ?? "buttons",
  };
}

function resolveImagePanel(
  c: Extract<GameComponent, { type: "image-panel" }>,
  state: GameState,
  varMap: Map<string, Variable>
): ResolvedImagePanel | ResolvedError {
  const variable = varMap.get(c.config.variableId);
  if (!variable) {
    return makeError(c, `Variable "${c.config.variableId}" not found`);
  }

  const imageUrl = String(state.variables[c.config.variableId] ?? c.config.fallbackUrl ?? "");

  return {
    id: c.id,
    type: "image-panel",
    name: c.name,
    order: c.order,
    imageUrl,
    aspectRatio: c.config.aspectRatio ?? "landscape",
    fallbackUrl: c.config.fallbackUrl,
  };
}

function resolveInventoryGrid(
  c: Extract<GameComponent, { type: "inventory-grid" }>,
  state: GameState,
  varMap: Map<string, Variable>
): ResolvedInventoryGrid | ResolvedError {
  const variable = varMap.get(c.config.variableId);
  if (!variable) {
    return makeError(c, `Variable "${c.config.variableId}" not found`);
  }

  const raw = state.variables[c.config.variableId] ?? "[]";
  let items: string[] = [];
  try {
    const parsed = JSON.parse(String(raw));
    if (Array.isArray(parsed)) {
      items = parsed.map(String);
    }
  } catch {
    items = [];
  }

  const maxSlots = c.config.maxSlots ?? 16;

  return {
    id: c.id,
    type: "inventory-grid",
    name: c.name,
    order: c.order,
    items: items.slice(0, maxSlots),
    columns: c.config.columns ?? 4,
    maxSlots,
  };
}

function resolveToggleSwitch(
  c: Extract<GameComponent, { type: "toggle-switch" }>,
  state: GameState,
  varMap: Map<string, Variable>
): ResolvedToggleSwitch | ResolvedError {
  const variable = varMap.get(c.config.variableId);
  if (!variable) {
    return makeError(c, `Variable "${c.config.variableId}" not found`);
  }

  const value = Boolean(state.variables[c.config.variableId] ?? false);

  return {
    id: c.id,
    type: "toggle-switch",
    name: c.name,
    order: c.order,
    value,
    onLabel: c.config.onLabel ?? "On",
    offLabel: c.config.offLabel ?? "Off",
    color: c.config.color,
  };
}

function makeError(c: GameComponent, message: string): ResolvedError {
  return {
    id: c.id,
    type: "error",
    name: c.name,
    order: c.order,
    message,
  };
}
