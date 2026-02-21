import type { WorldDefinition, WorldEntry } from "../types/index.js";

/**
 * Migrates a v1 WorldDefinition through all versions up to v5.
 * v1→v2: characters[], lorebookEntries[], settings.systemPrompt/greeting → entries[]
 * v2→v3: remove insertionOrder/group, merge into priority
 * v3→v4: layoutMode → uiMode
 * v4→v5: uiMode "persistent" → fullScreenComponent: true, deprecate uiMode
 * Idempotent — returns the input unchanged if already at current version.
 */
export function migrateWorldDefinition(raw: WorldDefinition): WorldDefinition {
  // Step 1: v1 → v2 migration (legacy characters/lorebook → entries)
  let migrated = migrateV1ToV2(raw);

  // Step 2: v2 → v3 migration (remove insertionOrder/group, merge into priority)
  migrated = migrateV2ToV3(migrated);

  // Step 3: v3 → v4 migration (layoutMode → uiMode)
  migrated = migrateV3ToV4(migrated);

  // Step 4: v4 → v5 migration (uiMode → fullScreenComponent)
  migrated = migrateV4ToV5(migrated);

  return migrated;
}

/**
 * v1 → v2: Convert characters[], lorebookEntries[], settings.systemPrompt/greeting → entries[]
 */
function migrateV1ToV2(raw: WorldDefinition): WorldDefinition {
  // Already migrated: has entries and no legacy fields with content
  if (raw.entries && raw.entries.length > 0) {
    return raw;
  }

  const hasLegacyData =
    (raw.characters && raw.characters.length > 0) ||
    (raw.lorebookEntries && raw.lorebookEntries.length > 0) ||
    (raw.settings?.systemPrompt && raw.settings.systemPrompt.length > 0) ||
    (raw.settings?.greeting && raw.settings.greeting.length > 0);

  if (!hasLegacyData) {
    // Nothing to migrate, just ensure entries exists
    return { ...raw, entries: raw.entries ?? [] };
  }

  const entries: WorldEntry[] = [];
  let priorityBase = 100;

  // 1. Migrate settings.systemPrompt → entry at position "top"
  if (raw.settings?.systemPrompt) {
    entries.push({
      id: "system-prompt",
      name: "System Prompt",
      content: raw.settings.systemPrompt,
      role: "system",
      position: "top",
      alwaysSend: true,
      keywords: [],
      conditions: [],
      conditionLogic: "all",
      priority: priorityBase,
      enabled: true,
    });
    priorityBase -= 10;
  }

  // 2. Migrate characters → entries at position "character"
  if (raw.characters) {
    for (const char of raw.characters) {
      entries.push({
        id: char.id,
        name: char.name,
        content: `You are ${char.name}. ${char.description}${char.systemPrompt ? `\n\n${char.systemPrompt}` : ""}`,
        role: "character",
        position: "character",
        alwaysSend: true,
        keywords: [],
        conditions: [],
        conditionLogic: "all",
        priority: priorityBase,
        enabled: true,
      });
      priorityBase -= 10;
    }
  }

  // 3. Migrate lorebookEntries → entries with mapped positions
  if (raw.lorebookEntries) {
    for (const lore of raw.lorebookEntries) {
      const position = lore.position === "before" ? "before_char" : "after_char";
      const roleMap: Record<string, WorldEntry["role"]> = {
        character: "character",
        lore: "lore",
        plot: "plot",
        style: "style",
        custom: "custom",
      };

      entries.push({
        id: lore.id,
        name: lore.name,
        content: lore.content,
        role: roleMap[lore.type] ?? "custom",
        position,
        alwaysSend: lore.alwaysSend,
        keywords: lore.keywords,
        conditions: lore.conditions,
        conditionLogic: lore.conditionLogic,
        priority: lore.priority,
        enabled: lore.enabled,
      });
    }
  }

  // 4. Migrate settings.greeting → entry at position "greeting"
  if (raw.settings?.greeting) {
    entries.push({
      id: "greeting",
      name: "Greeting",
      content: raw.settings.greeting,
      role: "greeting",
      position: "greeting",
      alwaysSend: true,
      keywords: [],
      conditions: [],
      conditionLogic: "all",
      priority: 0,
      enabled: true,
    });
  }

  // Build migrated definition — strip legacy fields from settings
  const { systemPrompt: _, greeting: __, ...cleanSettings } = raw.settings ?? {
    maxTokens: 12000,
    temperature: 1.0,
  };

  // Migrate flat lorebookTokenBudget to percentage-based if present
  if (cleanSettings.lorebookTokenBudget && !cleanSettings.lorebookBudgetPercent) {
    const maxCtx = cleanSettings.maxContext ?? 200000;
    cleanSettings.lorebookBudgetPercent = Math.min(
      100,
      Math.round((cleanSettings.lorebookTokenBudget / maxCtx) * 100) || 1
    );
  }

  return {
    ...raw,
    entries,
    avatar: raw.avatar ?? raw.characters?.[0]?.avatar,
    settings: cleanSettings as WorldDefinition["settings"],
  };
}

/**
 * v2 → v3: Remove insertionOrder and group from entries. Merge insertionOrder into priority.
 * Detection: any entry has `insertionOrder` property.
 * Conversion: newPriority = (1000 - insertionOrder * 10) + existingPriority
 */
function migrateV2ToV3(raw: WorldDefinition): WorldDefinition {
  // Check if any entry still has insertionOrder (v2 format)
  const hasInsertionOrder = raw.entries.some(
    (e) => "insertionOrder" in e && (e as Record<string, unknown>).insertionOrder !== undefined
  );

  if (!hasInsertionOrder && raw.version === "3.0.0") {
    return raw;
  }

  // If no entries or already clean, just bump version
  if (!hasInsertionOrder) {
    return { ...raw, version: "3.0.0" };
  }

  const entries = raw.entries.map((e) => {
    const entry = { ...e } as WorldEntry & { insertionOrder?: number; group?: string };
    const insertionOrder = entry.insertionOrder ?? 0;
    const existingPriority = entry.priority ?? 0;

    // Merge: higher insertionOrder → lower priority (placed later)
    const newPriority = (1000 - insertionOrder * 10) + existingPriority;

    delete entry.insertionOrder;
    delete entry.group;

    return { ...entry, priority: newPriority } as WorldEntry;
  });

  return {
    ...raw,
    version: "3.0.0",
    entries,
  };
}

/**
 * v3 → v4: Migrate layoutMode to uiMode.
 * - layoutMode "immersive" → uiMode "persistent"
 * - Worlds with displayTransforms → uiMode "per-reply"
 * - Everything else → uiMode "chat"
 */
function migrateV3ToV4(raw: WorldDefinition): WorldDefinition {
  if (raw.version === "4.0.0" || raw.version === "5.0.0") {
    return raw;
  }

  const settings = { ...raw.settings };
  const layoutMode = settings.layoutMode;

  if (layoutMode === "immersive") {
    settings.uiMode = "persistent";
  } else if (raw.displayTransforms && raw.displayTransforms.length > 0) {
    settings.uiMode = "per-reply";
  } else {
    settings.uiMode = "chat";
  }

  return {
    ...raw,
    version: "4.0.0",
    settings,
  };
}

/**
 * v4 → v5: Deprecate uiMode, add fullScreenComponent.
 * - uiMode "persistent" → fullScreenComponent: true
 * - All other uiModes → fullScreenComponent: false (default)
 */
function migrateV4ToV5(raw: WorldDefinition): WorldDefinition {
  if (raw.version === "5.0.0") {
    return raw;
  }

  const settings = { ...raw.settings };

  if (settings.uiMode === "persistent") {
    settings.fullScreenComponent = true;
  }

  return {
    ...raw,
    version: "5.0.0",
    settings,
  };
}
