/** All supported component types */
export type ComponentType =
  | "stat-bar"
  | "text-display"
  | "choice-list"
  | "image-panel"
  | "inventory-grid"
  | "toggle-switch"
  | "form";

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

export interface FormFieldConfig {
  id: string;
  label: string;
  type: "text" | "number" | "select" | "textarea" | "toggle";
  placeholder?: string;
  /** Options for "select" type fields */
  options?: string[];
  required?: boolean;
  defaultValue?: string | number | boolean;
}

export interface FormConfig {
  fields: FormFieldConfig[];
  /** Button text (default "Submit") */
  submitLabel?: string;
  /** Template for the user message. Use {{fieldId}} to interpolate field values. */
  messageTemplate?: string;
  /** Hide the form after successful submission (default true) */
  hideAfterSubmit?: boolean;
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

export interface FormComponent extends BaseComponent {
  type: "form";
  config: FormConfig;
}

export type GameComponent =
  | StatBarComponent
  | TextDisplayComponent
  | ChoiceListComponent
  | ImagePanelComponent
  | InventoryGridComponent
  | ToggleSwitchComponent
  | FormComponent;

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
  form: {
    label: "Form",
    description: "Interactive form that collects user input and sends it as a message",
    compatibleVariableTypes: ["string", "number", "boolean"],
  },
};
