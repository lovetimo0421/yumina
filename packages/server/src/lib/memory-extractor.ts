import { eq, and, desc } from "drizzle-orm";
import { db } from "../db/index.js";
import { messages, worldMemories } from "../db/schema.js";
import { createProvider, inferProvider } from "./llm/provider-factory.js";
import type { ProviderName } from "./llm/provider-factory.js";

const EXTRACTION_MODEL = "openai/gpt-4o-mini";
const MAX_MEMORIES_PER_WORLD = 100;

const EXTRACTION_PROMPT = `You are a memory extractor for an interactive fiction game. Analyze the conversation and extract key facts that should persist across play sessions.

Respond with a JSON array of memory objects:
[
  {
    "content": "concise description of the fact/event/decision",
    "category": "event" | "relationship" | "fact" | "decision",
    "importance": 1-10
  }
]

Categories:
- "event": Something that happened (e.g., "Player defeated the dragon")
- "relationship": How the player relates to NPCs (e.g., "Mira considers the player a trusted friend")
- "fact": World state facts (e.g., "The merchant's chest was found empty")
- "decision": Choices the player made (e.g., "Player chose to spare the thief")

Rules:
- Extract 3-10 memories per session
- Higher importance = more narratively significant (10 = life-changing, 1 = minor detail)
- Be concise — each memory should be one sentence
- Focus on facts that would affect future interactions
- Respond ONLY with the JSON array`;

interface ExtractedMemory {
  content: string;
  category: "event" | "relationship" | "fact" | "decision";
  importance: number;
}

/**
 * Extract persistent memories from a session's conversation.
 * Called when a session ends or on explicit save.
 */
export async function extractMemories(
  sessionId: string,
  worldId: string,
  userId: string,
  apiKey: string
): Promise<ExtractedMemory[]> {
  // Load recent messages from this session
  const sessionMessages = await db
    .select()
    .from(messages)
    .where(eq(messages.sessionId, sessionId))
    .orderBy(messages.createdAt);

  if (sessionMessages.length < 3) {
    return []; // too few messages to extract anything useful
  }

  const messageText = sessionMessages
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n\n");

  try {
    const providerName = inferProvider(EXTRACTION_MODEL);
    const provider = createProvider(providerName as ProviderName, apiKey);

    let response = "";
    for await (const chunk of provider.generateStream({
      model: EXTRACTION_MODEL,
      messages: [
        { role: "system", content: EXTRACTION_PROMPT },
        { role: "user", content: messageText },
      ],
      maxTokens: 1024,
      temperature: 0.3,
      responseFormat: { type: "json_object" },
    })) {
      if (chunk.type === "text") {
        response += chunk.content;
      }
    }

    // Parse the response
    let memories: ExtractedMemory[];
    try {
      const parsed = JSON.parse(response);
      memories = Array.isArray(parsed) ? parsed : parsed.memories ?? [];
    } catch {
      return [];
    }

    // Validate and clamp importance
    const valid = memories
      .filter(
        (m) =>
          m.content &&
          ["event", "relationship", "fact", "decision"].includes(m.category)
      )
      .map((m) => ({
        ...m,
        importance: Math.max(1, Math.min(10, m.importance ?? 5)),
      }));

    // Store in DB
    for (const memory of valid) {
      await db.insert(worldMemories).values({
        worldId,
        userId,
        content: memory.content,
        category: memory.category,
        importance: memory.importance,
        sessionId,
      });
    }

    // Prune old low-importance memories if over limit
    const allMemories = await db
      .select()
      .from(worldMemories)
      .where(
        and(eq(worldMemories.worldId, worldId), eq(worldMemories.userId, userId))
      )
      .orderBy(desc(worldMemories.importance));

    if (allMemories.length > MAX_MEMORIES_PER_WORLD) {
      const toDelete = allMemories.slice(MAX_MEMORIES_PER_WORLD);
      for (const mem of toDelete) {
        await db.delete(worldMemories).where(eq(worldMemories.id, mem.id));
      }
    }

    return valid;
  } catch {
    return [];
  }
}

/**
 * Load persistent memories for a world+user pair.
 * Returns memories sorted by importance (highest first).
 */
export async function loadWorldMemories(
  worldId: string,
  userId: string
): Promise<Array<{ content: string; category: string; importance: number }>> {
  const rows = await db
    .select()
    .from(worldMemories)
    .where(
      and(eq(worldMemories.worldId, worldId), eq(worldMemories.userId, userId))
    )
    .orderBy(desc(worldMemories.importance));

  return rows.map((r) => ({
    content: r.content,
    category: r.category,
    importance: r.importance,
  }));
}
