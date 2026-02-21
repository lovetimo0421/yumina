import {
  importSillyTavernCard,
  migrateWorldDefinition,
} from "@yumina/engine";
import type { WorldDefinition } from "@yumina/engine";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

type ImportFormat = "yumina" | "sillytavern" | "unknown";

export function detectFormat(json: unknown): ImportFormat {
  if (!json || typeof json !== "object") return "unknown";
  const obj = json as Record<string, unknown>;

  // Yumina WorldDefinition: has version string + entries array
  if (typeof obj.version === "string" && Array.isArray(obj.entries)) {
    return "yumina";
  }

  // ST V2: nested data object with character fields
  if (obj.data && typeof obj.data === "object") {
    const data = obj.data as Record<string, unknown>;
    if (data.name || data.first_mes || data.character_book) {
      return "sillytavern";
    }
  }

  // ST V1: top-level character fields
  if ((obj.name && obj.first_mes) || obj.character_book) {
    return "sillytavern";
  }

  return "unknown";
}

export async function parseImportedFile(file: File): Promise<WorldDefinition> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("File too large (max 5MB)");
  }

  const text = await file.text();

  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error("Invalid JSON file");
  }

  const format = detectFormat(json);

  switch (format) {
    case "yumina":
      return migrateWorldDefinition(json as WorldDefinition);

    case "sillytavern": {
      const converted = importSillyTavernCard(json);
      return migrateWorldDefinition(converted);
    }

    default:
      throw new Error(
        "Unrecognized file format. Expected a Yumina world or SillyTavern character card."
      );
  }
}
