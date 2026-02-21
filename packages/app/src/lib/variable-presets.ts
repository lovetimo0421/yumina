import type { Variable, GameComponent, Rule } from "@yumina/engine";

export interface VariablePresetPack {
  id: string;
  name: string;
  description: string;
  variables: Variable[];
  components: Omit<GameComponent, "id">[];
  rules?: Omit<Rule, "id">[];
}

/**
 * Pre-built variable + component packs that users can import into their worlds.
 * IDs are generated at import time for components; variable IDs are kept stable
 * since they're referenced by components and templates.
 */
export const VARIABLE_PRESET_PACKS: VariablePresetPack[] = [
  {
    id: "rpg-stats",
    name: "RPG Stats",
    description:
      "Classic RPG variables — health, mana, gold, and reputation with matching stat bars.",
    variables: [
      {
        id: "health",
        name: "Health",
        type: "number",
        defaultValue: 100,
        min: 0,
        max: 100,
        description: "Character hit points",
      },
      {
        id: "mana",
        name: "Mana",
        type: "number",
        defaultValue: 100,
        min: 0,
        max: 100,
        description: "Magical energy",
      },
      {
        id: "gold",
        name: "Gold",
        type: "number",
        defaultValue: 0,
        min: 0,
        description: "Currency",
      },
      {
        id: "reputation",
        name: "Reputation",
        type: "number",
        defaultValue: 0,
        min: -100,
        max: 100,
        description: "Standing with NPCs",
      },
    ],
    components: [
      {
        type: "stat-bar",
        name: "Health",
        order: 0,
        visible: true,
        config: { variableId: "health", color: "#ef4444", showValue: true },
      },
      {
        type: "stat-bar",
        name: "Mana",
        order: 1,
        visible: true,
        config: { variableId: "mana", color: "#3b82f6", showValue: true },
      },
      {
        type: "stat-bar",
        name: "Gold",
        order: 2,
        visible: true,
        config: { variableId: "gold", color: "#eab308", showValue: true },
      },
      {
        type: "text-display",
        name: "Reputation",
        order: 3,
        visible: true,
        config: { variableId: "reputation", format: "Reputation: {{value}}" },
      },
    ],
  },
  {
    id: "relationship",
    name: "Relationship",
    description:
      "Social dynamics — affinity, trust, mood, and romance stage for character interactions.",
    variables: [
      {
        id: "affinity",
        name: "Affinity",
        type: "number",
        defaultValue: 0,
        min: 0,
        max: 100,
        description: "How much the character likes the player",
      },
      {
        id: "trust",
        name: "Trust",
        type: "number",
        defaultValue: 0,
        min: 0,
        max: 100,
        description: "How much the character trusts the player",
      },
      {
        id: "mood",
        name: "Mood",
        type: "string",
        defaultValue: "neutral",
        description: "Current emotional state",
      },
      {
        id: "romance_stage",
        name: "Romance Stage",
        type: "string",
        defaultValue: "strangers",
        description: "Relationship progression (strangers → acquaintance → friend → close → romantic)",
      },
    ],
    components: [
      {
        type: "stat-bar",
        name: "Affinity",
        order: 0,
        visible: true,
        config: { variableId: "affinity", color: "#f43f5e", showValue: true },
      },
      {
        type: "stat-bar",
        name: "Trust",
        order: 1,
        visible: true,
        config: { variableId: "trust", color: "#8b5cf6", showValue: true },
      },
      {
        type: "text-display",
        name: "Mood",
        order: 2,
        visible: true,
        config: { variableId: "mood", format: "Mood: {{value}}" },
      },
      {
        type: "text-display",
        name: "Romance Stage",
        order: 3,
        visible: true,
        config: { variableId: "romance_stage", format: "Stage: {{value}}" },
      },
    ],
  },
  {
    id: "resource-management",
    name: "Resource Management",
    description:
      "Survival resources — power, water, food, population, and morale for simulation worlds.",
    variables: [
      {
        id: "power",
        name: "Power",
        type: "number",
        defaultValue: 50,
        min: 0,
        max: 100,
        description: "Electrical power supply",
      },
      {
        id: "water",
        name: "Water",
        type: "number",
        defaultValue: 100,
        min: 0,
        max: 200,
        description: "Water reserves",
      },
      {
        id: "food",
        name: "Food",
        type: "number",
        defaultValue: 150,
        min: 0,
        max: 300,
        description: "Food supplies",
      },
      {
        id: "population",
        name: "Population",
        type: "number",
        defaultValue: 10,
        min: 0,
        max: 50,
        description: "Number of inhabitants",
      },
      {
        id: "morale",
        name: "Morale",
        type: "number",
        defaultValue: 50,
        min: 0,
        max: 100,
        description: "Community morale",
      },
    ],
    components: [
      {
        type: "stat-bar",
        name: "Power",
        order: 0,
        visible: true,
        config: { variableId: "power", color: "#eab308", showValue: true },
      },
      {
        type: "stat-bar",
        name: "Water",
        order: 1,
        visible: true,
        config: { variableId: "water", color: "#06b6d4", showValue: true },
      },
      {
        type: "stat-bar",
        name: "Food",
        order: 2,
        visible: true,
        config: { variableId: "food", color: "#22c55e", showValue: true },
      },
      {
        type: "stat-bar",
        name: "Population",
        order: 3,
        visible: true,
        config: { variableId: "population", color: "#a855f7", showValue: true },
      },
      {
        type: "stat-bar",
        name: "Morale",
        order: 4,
        visible: true,
        config: { variableId: "morale", color: "#f97316", showValue: true },
      },
    ],
  },
  {
    id: "time-system",
    name: "Time System",
    description:
      "Day/time tracking — day count, time of day, and current location.",
    variables: [
      {
        id: "day_count",
        name: "Day",
        type: "number",
        defaultValue: 1,
        min: 1,
        description: "Current day number",
      },
      {
        id: "time_of_day",
        name: "Time of Day",
        type: "string",
        defaultValue: "morning",
        description: "Current time period (morning, afternoon, evening, night)",
      },
      {
        id: "location",
        name: "Location",
        type: "string",
        defaultValue: "starting area",
        description: "Current location name",
      },
    ],
    components: [
      {
        type: "text-display",
        name: "Day",
        order: 0,
        visible: true,
        config: { variableId: "day_count", format: "Day {{value}}" },
      },
      {
        type: "text-display",
        name: "Time of Day",
        order: 1,
        visible: true,
        config: { variableId: "time_of_day", format: "{{value}}" },
      },
      {
        type: "text-display",
        name: "Location",
        order: 2,
        visible: true,
        config: { variableId: "location", format: "{{value}}" },
      },
    ],
  },
  {
    id: "progression",
    name: "Progression",
    description:
      "Level-up system — level, experience, and story stage for adventure worlds.",
    variables: [
      {
        id: "level",
        name: "Level",
        type: "number",
        defaultValue: 1,
        min: 1,
        description: "Current level",
      },
      {
        id: "experience",
        name: "Experience",
        type: "number",
        defaultValue: 0,
        min: 0,
        description: "Experience points toward next level",
      },
      {
        id: "stage",
        name: "Stage",
        type: "string",
        defaultValue: "prologue",
        description: "Current story/progression stage",
      },
    ],
    components: [
      {
        type: "stat-bar",
        name: "Experience",
        order: 0,
        visible: true,
        config: { variableId: "experience", color: "#10b981", showValue: true },
      },
      {
        type: "text-display",
        name: "Level",
        order: 1,
        visible: true,
        config: { variableId: "level", format: "Level {{value}}" },
      },
      {
        type: "text-display",
        name: "Stage",
        order: 2,
        visible: true,
        config: { variableId: "stage", format: "{{value}}" },
      },
    ],
  },
];
