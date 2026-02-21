import type { WorldDefinition, WorldEntry, Variable, Rule, GameComponent } from "@yumina/engine";

export interface WorldTemplate {
  id: string;
  name: string;
  description: string;
  archetype: "chat" | "world" | "adventure";
  /** What's included — shown on the picker card */
  summary: { entries: number; variables: number; components: number; rules: number };
  build: () => WorldDefinition;
}

function entry(overrides: Omit<WorldEntry, "id" | "conditions" | "conditionLogic" | "enabled"> & Partial<Pick<WorldEntry, "conditions" | "conditionLogic" | "enabled">>): WorldEntry {
  return {
    id: crypto.randomUUID(),
    conditions: [],
    conditionLogic: "all",
    enabled: true,
    ...overrides,
  };
}

function variable(v: Variable): Variable {
  return v;
}

function component(c: Omit<GameComponent, "id">): GameComponent {
  return { ...c, id: crypto.randomUUID() } as GameComponent;
}

function rule(r: Omit<Rule, "id">): Rule {
  return { ...r, id: crypto.randomUUID() };
}

// ─── Character Chat ──────────────────────────────────────────────────────────

function buildCharacterChat(): WorldDefinition {
  return {
    id: crypto.randomUUID(),
    version: "3.0.0",
    name: "Character Chat",
    description: "One-on-one character roleplay",
    author: "",
    entries: [
      entry({
        name: "Main Prompt",
        content: "Write {{char}}'s next reply in a fictional chat between {{char}} and {{user}}. Stay in character at all times. Write detailed, vivid, and immersive responses.",
        role: "system",
        position: "top",
        alwaysSend: true,
        keywords: [],
        priority: 100,
      }),
      entry({
        name: "Character Identity",
        content: "[Describe your character here — name, appearance, personality, backstory, speech patterns, mannerisms.]",
        role: "character",
        position: "character",
        alwaysSend: true,
        keywords: [],
        priority: 90,
      }),
      entry({
        name: "Greeting",
        content: "[Write the character's opening message here. This is what the player sees first.]",
        role: "greeting",
        position: "greeting",
        alwaysSend: true,
        keywords: [],
        priority: 50,
      }),
      entry({
        name: "Stay In Character",
        content: "Stay in character as {{char}}. Never break character or speak as the narrator, author, system, or AI. All responses must be {{char}}'s in-the-moment subjective experience.",
        role: "system",
        position: "post_history",
        alwaysSend: true,
        keywords: [],
        priority: 95,
      }),
    ],
    variables: [
      variable({ id: "affinity", name: "Affinity", type: "number", defaultValue: 0, min: 0, max: 100, description: "How much the character likes the player" }),
      variable({ id: "mood", name: "Mood", type: "string", defaultValue: "neutral", description: "Character's current emotional state" }),
    ],
    rules: [],
    components: [
      component({ type: "stat-bar", name: "Affinity", order: 0, visible: true, config: { variableId: "affinity", color: "#f43f5e", showValue: true } }),
    ],
    audioTracks: [],
    customComponents: [],
    displayTransforms: [],
    settings: {
      maxTokens: 12000,
      maxContext: 200000,
      temperature: 1.0,
      topP: 1,
      frequencyPenalty: 0,
      presencePenalty: 0,
      playerName: "User",
      structuredOutput: false,
      lorebookScanDepth: 2,
      lorebookRecursionDepth: 0,
    },
  };
}

// ─── World Simulation ────────────────────────────────────────────────────────

function buildWorldSimulation(): WorldDefinition {
  return {
    id: crypto.randomUUID(),
    version: "3.0.0",
    name: "World Simulation",
    description: "Resource management and survival simulation",
    author: "",
    entries: [
      entry({
        name: "World System",
        content: `You are the narrator and game master of a simulation world. Track and update all game variables based on player actions. Present the world state clearly. Never make decisions for the player.

After each response, update relevant variables using the format:
[variable_id: operation value]

Example: [health: subtract 10] [gold: add 5] [location: set "marketplace"]`,
        role: "system",
        position: "top",
        alwaysSend: true,
        keywords: [],
        priority: 100,
      }),
      entry({
        name: "World State",
        content: `[Describe the simulation world — setting, key locations, factions, resources, and how they interact. This is the scenario the player inhabits.]`,
        role: "scenario",
        position: "after_char",
        alwaysSend: true,
        keywords: [],
        priority: 80,
      }),
      entry({
        name: "World Rules",
        content: `[Define the mechanical rules — how resources deplete, how time passes, what triggers events. The AI follows these rules to simulate the world.]`,
        role: "lore",
        position: "after_char",
        alwaysSend: true,
        keywords: [],
        priority: 70,
      }),
      entry({
        name: "Greeting",
        content: `[Opening scene description. Introduce the world, the player's situation, and present the first choice or challenge.]`,
        role: "greeting",
        position: "greeting",
        alwaysSend: true,
        keywords: [],
        priority: 50,
      }),
      entry({
        name: "Output Format",
        content: `Always end your response with a clear summary of the current state and available actions. Use the variable update format for any state changes.`,
        role: "style",
        position: "post_history",
        alwaysSend: true,
        keywords: [],
        priority: 90,
      }),
    ],
    variables: [
      variable({ id: "health", name: "Health", type: "number", defaultValue: 100, min: 0, max: 100, description: "Player health" }),
      variable({ id: "gold", name: "Gold", type: "number", defaultValue: 50, min: 0, description: "Currency" }),
      variable({ id: "location", name: "Location", type: "string", defaultValue: "starting area", description: "Current location" }),
      variable({ id: "day_count", name: "Day", type: "number", defaultValue: 1, min: 1, description: "Current day" }),
      variable({ id: "time_of_day", name: "Time of Day", type: "string", defaultValue: "morning", description: "Current time period" }),
    ],
    rules: [
      rule({
        name: "Low Health Warning",
        description: "Warn when health drops below 20",
        conditions: [{ variableId: "health", operator: "lt", value: 20 }],
        conditionLogic: "all",
        effects: [],
        priority: 0,
      }),
    ],
    components: [
      component({ type: "stat-bar", name: "Health", order: 0, visible: true, config: { variableId: "health", color: "#ef4444", showValue: true } }),
      component({ type: "stat-bar", name: "Gold", order: 1, visible: true, config: { variableId: "gold", color: "#eab308", showValue: true } }),
      component({ type: "text-display", name: "Location", order: 2, visible: true, config: { variableId: "location", format: "{{value}}" } }),
      component({ type: "text-display", name: "Time", order: 3, visible: true, config: { variableId: "time_of_day", format: "Day {{day_count}} — {{value}}" } }),
    ],
    audioTracks: [],
    customComponents: [],
    displayTransforms: [],
    settings: {
      maxTokens: 12000,
      maxContext: 200000,
      temperature: 1.0,
      topP: 1,
      frequencyPenalty: 0,
      presencePenalty: 0,
      playerName: "User",
      structuredOutput: false,
      lorebookScanDepth: 2,
      lorebookRecursionDepth: 0,
    },
  };
}

// ─── Progressive Adventure ───────────────────────────────────────────────────

function buildProgressiveAdventure(): WorldDefinition {
  return {
    id: crypto.randomUUID(),
    version: "3.0.0",
    name: "Progressive Adventure",
    description: "Level-based adventure with progression system",
    author: "",
    entries: [
      entry({
        name: "Adventure Framework",
        content: `You are the narrator of a progressive adventure. Guide the player through an evolving story with challenges, discoveries, and character growth. Track experience and level progression.

After each response, update variables:
[variable_id: operation value]

Award experience for meaningful actions. When experience reaches 100, trigger a level-up event and reset experience to 0.`,
        role: "system",
        position: "top",
        alwaysSend: true,
        keywords: [],
        priority: 100,
      }),
      entry({
        name: "Protagonist",
        content: `[Define the protagonist template — their role in the world, starting abilities, and growth potential. The player shapes this character through their choices.]`,
        role: "character",
        position: "character",
        alwaysSend: true,
        keywords: [],
        priority: 90,
      }),
      entry({
        name: "World Mechanics",
        content: `[Define the world's rules — magic system, combat rules, social hierarchy, technology level, etc. These provide the framework for challenges and progression.]`,
        role: "lore",
        position: "after_char",
        alwaysSend: true,
        keywords: [],
        priority: 80,
      }),
      entry({
        name: "Power System",
        content: `[Define the progression/power system — what abilities unlock at each level, how combat works, what resources are available. This guides the AI on scaling challenges.]`,
        role: "lore",
        position: "after_char",
        alwaysSend: true,
        keywords: [],
        priority: 75,
      }),
      entry({
        name: "Story Progression",
        content: `[Optional: Define plot hooks or story arcs that trigger at specific stages. E.g., "When stage changes to 'chapter_2', introduce the main antagonist."]`,
        role: "plot",
        position: "after_char",
        alwaysSend: false,
        keywords: ["chapter", "stage", "quest"],
        conditions: [],
        conditionLogic: "all",
        priority: 60,
      }),
      entry({
        name: "Greeting",
        content: `[Chapter 1 opening — establish the setting, introduce the protagonist's situation, and present the first challenge or mystery.]`,
        role: "greeting",
        position: "greeting",
        alwaysSend: true,
        keywords: [],
        priority: 50,
      }),
      entry({
        name: "Narrative Guidance",
        content: `Maintain a consistent narrative voice. End each response at a natural mid-scene point — never wrap up or conclude. Always leave threads for the player to pull on.`,
        role: "style",
        position: "post_history",
        alwaysSend: true,
        keywords: [],
        priority: 90,
      }),
    ],
    variables: [
      variable({ id: "level", name: "Level", type: "number", defaultValue: 1, min: 1, description: "Current level" }),
      variable({ id: "experience", name: "Experience", type: "number", defaultValue: 0, min: 0, max: 100, description: "XP toward next level" }),
      variable({ id: "health", name: "Health", type: "number", defaultValue: 100, min: 0, max: 100, description: "Hit points" }),
      variable({ id: "stage", name: "Stage", type: "string", defaultValue: "prologue", description: "Current story stage" }),
    ],
    rules: [
      rule({
        name: "Level Up",
        description: "Level up when experience reaches 100",
        conditions: [{ variableId: "experience", operator: "gte", value: 100 }],
        conditionLogic: "all",
        effects: [
          { variableId: "level", operation: "add", value: 1 },
          { variableId: "experience", operation: "set", value: 0 },
        ],
        priority: 0,
      }),
    ],
    components: [
      component({ type: "stat-bar", name: "Health", order: 0, visible: true, config: { variableId: "health", color: "#ef4444", showValue: true } }),
      component({ type: "stat-bar", name: "Experience", order: 1, visible: true, config: { variableId: "experience", color: "#10b981", showValue: true } }),
      component({ type: "text-display", name: "Level", order: 2, visible: true, config: { variableId: "level", format: "Level {{value}}" } }),
      component({ type: "text-display", name: "Stage", order: 3, visible: true, config: { variableId: "stage", format: "{{value}}" } }),
    ],
    audioTracks: [],
    customComponents: [],
    displayTransforms: [],
    settings: {
      maxTokens: 12000,
      maxContext: 200000,
      temperature: 1.0,
      topP: 1,
      frequencyPenalty: 0,
      presencePenalty: 0,
      playerName: "User",
      structuredOutput: false,
      lorebookScanDepth: 2,
      lorebookRecursionDepth: 0,
    },
  };
}

// ─── Exports ─────────────────────────────────────────────────────────────────

export const WORLD_TEMPLATES: WorldTemplate[] = [
  {
    id: "character-chat",
    name: "Character Chat",
    description: "One-on-one roleplay with a single character. Includes affinity tracking and mood system.",
    archetype: "chat",
    summary: { entries: 4, variables: 2, components: 1, rules: 0 },
    build: buildCharacterChat,
  },
  {
    id: "world-simulation",
    name: "World Simulation",
    description: "Resource management sandbox with day/night cycle, locations, and survival mechanics.",
    archetype: "world",
    summary: { entries: 5, variables: 5, components: 4, rules: 1 },
    build: buildWorldSimulation,
  },
  {
    id: "progressive-adventure",
    name: "Progressive Adventure",
    description: "Level-based adventure with XP, story stages, and escalating challenges.",
    archetype: "adventure",
    summary: { entries: 7, variables: 4, components: 4, rules: 1 },
    build: buildProgressiveAdventure,
  },
];
