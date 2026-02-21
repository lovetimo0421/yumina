import type {
  WorldDefinition,
  WorldEntry,
  Variable,
} from "../types/index.js";

/** Simple UUID v4 generator — no DOM/crypto dependency needed for content IDs */
function uuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ── ST entry types ───────────────────────────────────────────────────────────

interface STEntry {
  uid?: number;
  key?: string[];
  keysecondary?: string[];
  content?: string;
  comment?: string;
  constant?: boolean;
  enabled?: boolean;
  insertion_order?: number;
  priority?: number;
  position?: number;
  depth?: number;
  selectiveLogic?: number;
  group?: string;
  extensions?: {
    position?: number;
    depth?: number;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

interface STCharacterBook {
  name?: string;
  description?: string;
  entries?: Record<string | number, STEntry> | STEntry[];
}

interface STCard {
  name?: string;
  description?: string;
  first_mes?: string;
  personality?: string;
  scenario?: string;
  mes_example?: string;
  system_prompt?: string;
  post_history_instructions?: string;
  character_book?: STCharacterBook;
  data?: {
    name?: string;
    description?: string;
    first_mes?: string;
    personality?: string;
    scenario?: string;
    mes_example?: string;
    system_prompt?: string;
    post_history_instructions?: string;
    character_book?: STCharacterBook;
    extensions?: Record<string, unknown>;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

// ── Position mapping ─────────────────────────────────────────────────────────

function mapPosition(stPos: number | undefined): WorldEntry["position"] {
  switch (stPos) {
    case 0: return "before_char";
    case 1: return "after_char";
    case 2: return "bottom";
    case 3: return "bottom";
    case 4: return "depth";
    default: return "after_char";
  }
}

// ── Role inference ───────────────────────────────────────────────────────────

/** Patterns that indicate this entry should be skipped (variable init, MVU update) */
const SKIP_PATTERNS = [
  /initvar/i,
  /初始/,
  /变量初始/,
  /mvu_update/i,
  /mvu_初始/,
];

/** Infer role from entry name and content */
function inferRole(name: string, content: string): WorldEntry["role"] {
  const text = `${name} ${content}`.toLowerCase();

  if (/格式|format|cot|输出格式|output format/i.test(name)) return "style";
  if (/章节|chapter|plot|剧情|故事/i.test(name)) return "plot";
  if (/角色|character|人物|npc/i.test(name)) return "character";
  if (/世界|world|设定|背景|lore/i.test(name)) return "lore";
  if (/场景|scenario|场所/i.test(name)) return "scenario";
  if (/人格|personality|性格/i.test(name)) return "personality";
  if (/system|系统/i.test(name)) return "system";
  if (/greeting|问候|开场/i.test(name)) return "greeting";

  // Fallback: check content patterns
  if (/\{\{char\}\}.*personality|性格|外貌|appearance/i.test(text)) return "character";

  return "custom";
}

/** Check if an entry name matches skip patterns (InitVar, MVU) */
function shouldSkipEntry(name: string): boolean {
  return SKIP_PATTERNS.some((p) => p.test(name));
}

// ── Variable extraction ──────────────────────────────────────────────────────

/**
 * Attempt to extract variables from InitVar-style YAML content.
 * Handles patterns like:
 *   绘里奈.好感度: 0
 *   shelter.power: 50
 *   some_key: "string_value"
 */
function extractVariablesFromContent(content: string): Variable[] {
  const variables: Variable[] = [];
  const lines = content.split("\n");

  for (const line of lines) {
    // Match YAML-like key: value pairs (possibly with dot-separated paths)
    const match = line.match(/^\s*([^:#\n]+?)\s*[:：]\s*(.+?)\s*$/);
    if (!match) continue;

    const rawKey = match[1]!.trim();
    const rawValue = match[2]!.trim();

    // Skip lines that look like comments or headers
    if (rawKey.startsWith("#") || rawKey.startsWith("-") || rawKey.startsWith("//")) continue;
    // Skip long keys (likely sentences, not variable names)
    if (rawKey.length > 60) continue;

    // Flatten dotted paths: 绘里奈.好感度 → 绘里奈_好感度
    const id = rawKey
      .replace(/[.\s]+/g, "_")
      .replace(/[^a-zA-Z0-9_\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff]/g, "")
      .toLowerCase();

    if (!id || id.length < 1) continue;

    // Parse value
    const numValue = Number(rawValue);
    if (!isNaN(numValue) && rawValue !== "") {
      variables.push({
        id,
        name: rawKey.replace(/[._]/g, " "),
        type: "number",
        defaultValue: numValue,
      });
    } else if (rawValue === "true" || rawValue === "false") {
      variables.push({
        id,
        name: rawKey.replace(/[._]/g, " "),
        type: "boolean",
        defaultValue: rawValue === "true",
      });
    } else {
      // String — strip quotes
      const strVal = rawValue.replace(/^["'「]|["'」]$/g, "").trim();
      if (strVal.length > 0 && strVal.length < 200) {
        variables.push({
          id,
          name: rawKey.replace(/[._]/g, " "),
          type: "string",
          defaultValue: strVal,
        });
      }
    }
  }

  return variables;
}

// ── Main importer ────────────────────────────────────────────────────────────

/**
 * Import a SillyTavern character card or world book JSON into a Yumina WorldDefinition.
 *
 * Handles both V1 (top-level fields) and V2 (nested `data` object) card formats,
 * as well as standalone world_book/character_book objects.
 */
export function importSillyTavernCard(json: unknown): WorldDefinition {
  const raw = json as STCard;

  // V2 cards nest everything under `data`
  const data = raw.data ?? raw;
  const charBook = data.character_book ?? raw.character_book;

  const entries: WorldEntry[] = [];
  const variables: Variable[] = [];
  const seenVarIds = new Set<string>();

  // ── Character fields → entries ──────────────────────────────────────────

  if (data.system_prompt) {
    entries.push(makeEntry({
      name: "System Prompt",
      content: data.system_prompt,
      role: "system",
      position: "top",
      alwaysSend: true,
      priority: 100,
    }));
  }

  if (data.description) {
    entries.push(makeEntry({
      name: data.name ? `${data.name} — Description` : "Character Description",
      content: data.description,
      role: "character",
      position: "character",
      alwaysSend: true,
      priority: 90,
    }));
  }

  if (data.personality) {
    entries.push(makeEntry({
      name: data.name ? `${data.name} — Personality` : "Personality",
      content: data.personality,
      role: "personality",
      position: "character",
      alwaysSend: true,
      priority: 85,
    }));
  }

  if (data.scenario) {
    entries.push(makeEntry({
      name: "Scenario",
      content: data.scenario,
      role: "scenario",
      position: "after_char",
      alwaysSend: true,
      priority: 80,
    }));
  }

  if (data.mes_example) {
    entries.push(makeEntry({
      name: "Example Messages",
      content: data.mes_example,
      role: "example",
      position: "bottom",
      alwaysSend: true,
      priority: 40,
    }));
  }

  if (data.first_mes) {
    entries.push(makeEntry({
      name: "Greeting",
      content: data.first_mes,
      role: "greeting",
      position: "greeting",
      alwaysSend: true,
      priority: 50,
    }));
  }

  if (data.post_history_instructions) {
    entries.push(makeEntry({
      name: "Post-History Instructions",
      content: data.post_history_instructions,
      role: "system",
      position: "post_history",
      alwaysSend: true,
      priority: 95,
    }));
  }

  // ── Character book entries ──────────────────────────────────────────────

  if (charBook?.entries) {
    const stEntries: STEntry[] = Array.isArray(charBook.entries)
      ? charBook.entries
      : Object.values(charBook.entries);

    for (const stEntry of stEntries) {
      if (!stEntry || typeof stEntry !== "object") continue;

      const name = stEntry.comment || stEntry.key?.[0] || `Entry ${stEntry.uid ?? "?"}`;
      const content = stEntry.content ?? "";

      // Check for InitVar / MVU entries → extract variables
      if (shouldSkipEntry(name)) {
        const extracted = extractVariablesFromContent(content);
        for (const v of extracted) {
          if (!seenVarIds.has(v.id)) {
            seenVarIds.add(v.id);
            variables.push(v);
          }
        }
        continue;
      }

      // Resolve position — prefer extensions.position over top-level
      const stPosition = stEntry.extensions?.position ?? stEntry.position;
      const position = mapPosition(stPosition as number | undefined);
      const depth = position === "depth" ? (stEntry.extensions?.depth ?? stEntry.depth ?? 4) as number : undefined;

      const role = inferRole(name, content);
      const keywords = (stEntry.key ?? []).filter((k) => k && k.trim().length > 0);
      const secondaryKeywords = (stEntry.keysecondary ?? []).filter((k) => k && k.trim().length > 0);

      // Map selectiveLogic: 0=AND_ANY, 1=NOT_ANY, 2=NOT_ALL, 3=AND_ALL
      let secondaryKeywordLogic: WorldEntry["secondaryKeywordLogic"] = "AND_ANY";
      if (stEntry.selectiveLogic === 1) secondaryKeywordLogic = "NOT_ANY";
      else if (stEntry.selectiveLogic === 2) secondaryKeywordLogic = "NOT_ALL";
      else if (stEntry.selectiveLogic === 3) secondaryKeywordLogic = "AND_ALL";

      // Priority mapping: ST has insertion_order (lower=earlier) and priority.
      // We merged these into a single `priority` (higher=earlier).
      // Use ST priority if present, otherwise invert insertion_order.
      const priority = stEntry.priority ?? (1000 - (stEntry.insertion_order ?? 500));

      entries.push(makeEntry({
        name,
        content,
        role,
        position,
        depth,
        alwaysSend: stEntry.constant ?? false,
        keywords,
        secondaryKeywords: secondaryKeywords.length > 0 ? secondaryKeywords : undefined,
        secondaryKeywordLogic: secondaryKeywords.length > 0 ? secondaryKeywordLogic : undefined,
        priority,
        enabled: stEntry.enabled ?? true,
      }));
    }
  }

  // If no entries were created at all, add a minimal main prompt
  if (entries.length === 0) {
    entries.push(makeEntry({
      name: "Main Prompt",
      content: "Write {{char}}'s next reply in a fictional chat between {{char}} and {{user}}.",
      role: "system",
      position: "top",
      alwaysSend: true,
      priority: 100,
    }));
  }

  const cardName = data.name || charBook?.name || "Imported World";

  return {
    id: uuid(),
    version: "3.0.0",
    name: cardName,
    description: charBook?.description || data.scenario || "",
    author: "",
    entries,
    variables,
    rules: [],
    components: [],
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

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeEntry(opts: {
  name: string;
  content: string;
  role: WorldEntry["role"];
  position: WorldEntry["position"];
  depth?: number;
  alwaysSend: boolean;
  keywords?: string[];
  secondaryKeywords?: string[];
  secondaryKeywordLogic?: WorldEntry["secondaryKeywordLogic"];
  priority: number;
  enabled?: boolean;
}): WorldEntry {
  return {
    id: uuid(),
    name: opts.name,
    content: opts.content,
    role: opts.role,
    position: opts.position,
    depth: opts.depth,
    alwaysSend: opts.alwaysSend,
    keywords: opts.keywords ?? [],
    conditions: [],
    conditionLogic: "all",
    priority: opts.priority,
    enabled: opts.enabled ?? true,
    secondaryKeywords: opts.secondaryKeywords,
    secondaryKeywordLogic: opts.secondaryKeywordLogic,
  };
}
