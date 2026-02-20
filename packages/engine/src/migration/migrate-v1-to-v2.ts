import type { WorldDefinition, WorldEntry } from "../types/index.js";

/**
 * Migrates a v1 WorldDefinition (characters[], lorebookEntries[], settings.systemPrompt/greeting)
 * to v2 format (entries[]). Idempotent — returns the input unchanged if already v2.
 */
export function migrateWorldDefinition(raw: WorldDefinition): WorldDefinition {
  // Already migrated: has entries and no legacy fields with content
  if (
    raw.entries &&
    raw.entries.length > 0
  ) {
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
  let order = 0;

  // 1. Migrate settings.systemPrompt → entry at position "top"
  if (raw.settings?.systemPrompt) {
    entries.push({
      id: "system-prompt",
      name: "System Prompt",
      content: raw.settings.systemPrompt,
      role: "system",
      position: "top",
      insertionOrder: order++,
      alwaysSend: true,
      keywords: [],
      conditions: [],
      conditionLogic: "all",
      priority: 100,
      enabled: true,
    });
  }

  // 2. Migrate characters → entries at position "character"
  if (raw.characters) {
    for (const char of raw.characters) {
      // Character identity entry
      entries.push({
        id: char.id,
        name: char.name,
        content: `You are ${char.name}. ${char.description}${char.systemPrompt ? `\n\n${char.systemPrompt}` : ""}`,
        role: "character",
        position: "character",
        insertionOrder: order++,
        alwaysSend: true,
        keywords: [],
        conditions: [],
        conditionLogic: "all",
        priority: 90,
        enabled: true,
      });
    }
  }

  // 3. Migrate lorebookEntries → entries with mapped positions
  if (raw.lorebookEntries) {
    for (const lore of raw.lorebookEntries) {
      // Map old position to new position slots
      const position = lore.position === "before" ? "before_char" : "after_char";

      // Map old type to new role
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
        insertionOrder: order++,
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
      insertionOrder: order++,
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
    maxTokens: 2048,
    temperature: 0.8,
  };

  return {
    ...raw,
    entries,
    // Carry avatar from first character if world doesn't have one
    avatar: raw.avatar ?? raw.characters?.[0]?.avatar,
    settings: cleanSettings as WorldDefinition["settings"],
  };
}
