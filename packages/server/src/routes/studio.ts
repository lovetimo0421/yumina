import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { worlds, apiKeys } from "../db/schema.js";
import { authMiddleware } from "../middleware/auth.js";
import { decryptApiKey } from "../lib/crypto.js";
import { createProvider, inferProvider } from "../lib/llm/provider-factory.js";
import type { ProviderName } from "../lib/llm/provider-factory.js";
import type { WorldDefinition } from "@yumina/engine";
import type { AppEnv } from "../lib/types.js";

const studioRoutes = new Hono<AppEnv>();

studioRoutes.use("/*", authMiddleware);

// Helper: get user's active API key for a provider
async function getUserApiKey(userId: string, provider = "openrouter") {
  const rows = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.userId, userId));

  const row = rows.find((r) => r.provider === provider);
  if (!row) return null;
  return decryptApiKey(row.encryptedKey, row.keyIv, row.keyTag);
}

// POST /api/studio/:worldId/chat — Studio AI assistant (SSE streaming)
studioRoutes.post("/:worldId/chat", async (c) => {
  const currentUser = c.get("user");
  const worldId = c.req.param("worldId");
  const body = await c.req.json<{
    messages: { role: "user" | "assistant"; content: string }[];
    context?: { selectedElement?: string; activePanel?: string };
    model?: string;
  }>();

  // Load world
  const worldRows = await db
    .select()
    .from(worlds)
    .where(eq(worlds.id, worldId));

  if (worldRows.length === 0) {
    return c.json({ error: "World not found" }, 404);
  }

  const world = worldRows[0]!;
  const worldDef = world.schema as unknown as WorldDefinition;
  const model = body.model ?? "openai/gpt-4o-mini";

  // Resolve provider
  const providerName = inferProvider(model);
  const apiKey = await getUserApiKey(currentUser.id, providerName);
  if (!apiKey) {
    return c.json({ error: "No API key configured for this provider" }, 400);
  }

  const provider = createProvider(providerName as ProviderName, apiKey);

  // Build studio system prompt
  const systemPrompt = buildStudioSystemPrompt(worldDef, body.context);

  const chatMessages = [
    { role: "system" as const, content: systemPrompt },
    ...body.messages,
  ];

  return streamSSE(c, async (stream) => {
    let fullContent = "";

    try {
      for await (const chunk of provider.generateStream({
        model,
        messages: chatMessages,
        maxTokens: 4096,
        temperature: 0.7,
        responseFormat: { type: "json_object" as const },
      })) {
        if (chunk.type === "text") {
          fullContent += chunk.content;
          await stream.writeSSE({
            event: "text",
            data: JSON.stringify({ content: chunk.content }),
          });
        }

        if (chunk.type === "error") {
          await stream.writeSSE({
            event: "error",
            data: JSON.stringify({ error: chunk.content }),
          });
          return;
        }

        if (chunk.type === "done") {
          // Parse the studio response
          let parsed: StudioResponse;
          try {
            parsed = JSON.parse(fullContent);
          } catch {
            // If JSON parsing fails, treat the whole response as a message
            parsed = { message: fullContent, actions: [] };
          }

          await stream.writeSSE({
            event: "done",
            data: JSON.stringify({
              message: parsed.message ?? fullContent,
              actions: parsed.actions ?? [],
              tokenCount: chunk.usage?.totalTokens ?? null,
            }),
          });
        }
      }
    } catch (err) {
      await stream.writeSSE({
        event: "error",
        data: JSON.stringify({
          error: err instanceof Error ? err.message : "Studio chat failed",
        }),
      });
    }
  });
});

interface StudioResponse {
  message: string;
  actions: StudioAction[];
}

interface StudioAction {
  type: string;
  data: Record<string, unknown>;
}

function buildStudioSystemPrompt(
  worldDef: WorldDefinition,
  context?: { selectedElement?: string; activePanel?: string }
): string {
  const parts: string[] = [];

  parts.push(
    `You are an AI assistant helping to build an interactive fiction world in the Yumina Creator Studio.
You help users create and modify game worlds by responding with structured JSON actions.

ALWAYS respond with a JSON object in this format:
{
  "message": "Your conversational response to the user",
  "actions": [{ "type": "actionType", "data": { ... } }]
}

Available action types:
- addVariable: { id, name, type: "number"|"string"|"boolean", defaultValue, description?, min?, max? }
- updateVariable: { id, ...fieldsToUpdate }
- removeVariable: { id }
- addCharacter: { id, name, description, systemPrompt }
- updateCharacter: { id, ...fieldsToUpdate }
- removeCharacter: { id }
- addRule: { id, name, description?, conditions, conditionLogic, effects, priority }
- updateRule: { id, ...fieldsToUpdate }
- removeRule: { id }
- addComponent: { id, type, name, order, visible, config }
- updateComponent: { id, ...fieldsToUpdate }
- removeComponent: { id }
- addAudioTrack: { id, name, type: "bgm"|"sfx"|"ambient", url, loop?, volume? }
- updateAudioTrack: { id, ...fieldsToUpdate }
- removeAudioTrack: { id }
- addLorebookEntry: { id, name, type: "character"|"lore"|"plot"|"style"|"custom", content, keywords, priority?, position?, enabled? }
- updateLorebookEntry: { id, ...fieldsToUpdate }
- removeLorebookEntry: { id }
- addCustomComponent: { id, name, tsxCode, description? }
- updateCustomComponent: { id, ...fieldsToUpdate }
- removeCustomComponent: { id }
- updateSettings: { ...settingsFieldsToUpdate }

Rules:
- "message" is REQUIRED — explain what you did in plain language
- "actions" is optional — only include when making changes
- Generate unique IDs using descriptive kebab-case (e.g., "health-bar", "tavern-bgm")
- When creating TSX custom components, write valid React JSX that accepts { variables, metadata, worldName } as props
- Respond ONLY with the JSON object, no other text`
  );

  // Current world state
  parts.push(`\nCurrent world: "${worldDef.name}"`);
  parts.push(`Description: ${worldDef.description || "(none)"}`);

  if (worldDef.variables.length > 0) {
    const varList = worldDef.variables
      .map((v) => `  - ${v.id}: ${v.name} (${v.type}, default: ${v.defaultValue})`)
      .join("\n");
    parts.push(`\nVariables:\n${varList}`);
  } else {
    parts.push("\nVariables: (none)");
  }

  if (worldDef.characters.length > 0) {
    const charList = worldDef.characters
      .map((ch) => `  - ${ch.id}: ${ch.name}`)
      .join("\n");
    parts.push(`\nCharacters:\n${charList}`);
  }

  if (worldDef.rules.length > 0) {
    const ruleList = worldDef.rules
      .map((r) => `  - ${r.id}: ${r.name} (priority: ${r.priority})`)
      .join("\n");
    parts.push(`\nRules:\n${ruleList}`);
  }

  if (worldDef.components.length > 0) {
    const compList = worldDef.components
      .map((comp) => `  - ${comp.id}: ${comp.name} (${comp.type})`)
      .join("\n");
    parts.push(`\nComponents:\n${compList}`);
  }

  if (worldDef.lorebookEntries && worldDef.lorebookEntries.length > 0) {
    const loreList = worldDef.lorebookEntries
      .map((e) => `  - ${e.id}: ${e.name} (${e.type})`)
      .join("\n");
    parts.push(`\nLorebook Entries:\n${loreList}`);
  }

  if (worldDef.customComponents && worldDef.customComponents.length > 0) {
    const ccList = worldDef.customComponents
      .map((cc) => `  - ${cc.id}: ${cc.name}`)
      .join("\n");
    parts.push(`\nCustom Components:\n${ccList}`);
  }

  if (context?.selectedElement) {
    parts.push(`\nCurrently selected element: ${context.selectedElement}`);
  }

  if (context?.activePanel) {
    parts.push(`Active panel: ${context.activePanel}`);
  }

  return parts.join("\n");
}

export { studioRoutes };
