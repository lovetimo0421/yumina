/** All supported component types */
export type ComponentType =
  | "stat-bar"
  | "text-display"
  | "choice-list"
  | "image-panel"
  | "inventory-grid"
  | "toggle-switch";

// ── Per-type config interfaces ──

export interface StatBarConfig {
  variableId: string;
  /** CSS color or preset name */
  color?: string;
  /** Show numeric value next to bar (default true) */
  showValue?: boolean;
  /** Show variable name as label (default true) */
  showLabel?: boolean;
  /** Optional variable for dynamic max (overrides variable.max) */
  secondaryVariableId?: string;
}

export interface TextDisplayConfig {
  variableId: string;
  /** Template string, e.g. "Location: {{value}}" */
  format?: string;
  fontSize?: "sm" | "md" | "lg";
  /** Lucide icon name */
  icon?: string;
}

export interface ChoiceListConfig {
  variableId: string;
  /** Max choices to display (default 4) */
  maxChoices?: number;
  /** Rendering style */
  style?: "buttons" | "list";
}

export interface ImagePanelConfig {
  variableId: string;
  aspectRatio?: "square" | "portrait" | "landscape" | "wide";
  fallbackUrl?: string;
}

export interface InventoryGridConfig {
  variableId: string;
  /** Grid columns (default 4) */
  columns?: number;
  /** Max items (default 16) */
  maxSlots?: number;
}

export interface ToggleSwitchConfig {
  variableId: string;
  onLabel?: string;
  offLabel?: string;
  color?: string;
}

// ── Discriminated union ──

interface BaseComponent {
  id: string;
  name: string;
  /** Display order (lower = higher) */
  order: number;
  /** Hide from GamePanel without removing (default true) */
  visible?: boolean;
}

export interface StatBarComponent extends BaseComponent {
  type: "stat-bar";
  config: StatBarConfig;
}

export interface TextDisplayComponent extends BaseComponent {
  type: "text-display";
  config: TextDisplayConfig;
}

export interface ChoiceListComponent extends BaseComponent {
  type: "choice-list";
  config: ChoiceListConfig;
}

export interface ImagePanelComponent extends BaseComponent {
  type: "image-panel";
  config: ImagePanelConfig;
}

export interface InventoryGridComponent extends BaseComponent {
  type: "inventory-grid";
  config: InventoryGridConfig;
}

export interface ToggleSwitchComponent extends BaseComponent {
  type: "toggle-switch";
  config: ToggleSwitchConfig;
}

export type GameComponent =
  | StatBarComponent
  | TextDisplayComponent
  | ChoiceListComponent
  | ImagePanelComponent
  | InventoryGridComponent
  | ToggleSwitchComponent;

// ── Metadata for the editor ──

export interface ComponentTypeMeta {
  label: string;
  description: string;
  compatibleVariableTypes: Array<"number" | "string" | "boolean">;
}

export const COMPONENT_TYPE_META: Record<ComponentType, ComponentTypeMeta> = {
  "stat-bar": {
    label: "Stat Bar",
    description: "Progress bar bound to a numeric variable (HP, mana, stamina)",
    compatibleVariableTypes: ["number"],
  },
  "text-display": {
    label: "Text Display",
    description: "Shows a variable value as formatted text (location, status)",
    compatibleVariableTypes: ["number", "string", "boolean"],
  },
  "choice-list": {
    label: "Choice List",
    description: "Clickable choices presented by the AI",
    compatibleVariableTypes: ["string"],
  },
  "image-panel": {
    label: "Image Panel",
    description: "Displays an image from a URL variable (scene art, portraits)",
    compatibleVariableTypes: ["string"],
  },
  "inventory-grid": {
    label: "Inventory Grid",
    description: "Grid of items from a JSON array string variable",
    compatibleVariableTypes: ["string"],
  },
  "toggle-switch": {
    label: "Toggle Switch",
    description: "On/off indicator bound to a boolean variable",
    compatibleVariableTypes: ["boolean"],
  },
};
