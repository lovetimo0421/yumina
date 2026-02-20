import { Hono } from "hono";
import { eq, and, desc } from "drizzle-orm";
import { db } from "../db/index.js";
import { playSessions, worlds, messages, apiKeys, worldMemories } from "../db/schema.js";
import { authMiddleware } from "../middleware/auth.js";
import { decryptApiKey } from "../lib/crypto.js";
import { extractMemories, loadWorldMemories } from "../lib/memory-extractor.js";
import type { AppEnv } from "../lib/types.js";
import type { WorldDefinition } from "@yumina/engine";
import { GameStateManager } from "@yumina/engine";

const sessionRoutes = new Hono<AppEnv>();

sessionRoutes.use("/*", authMiddleware);

// POST /api/sessions — create session
sessionRoutes.post("/", async (c) => {
  const currentUser = c.get("user");
  const body = await c.req.json<{ worldId: string }>();

  if (!body.worldId) {
    return c.json({ error: "worldId is required" }, 400);
  }

  // Load the world
  const worldRows = await db
    .select()
    .from(worlds)
    .where(eq(worlds.id, body.worldId));

  if (worldRows.length === 0) {
    return c.json({ error: "World not found" }, 404);
  }

  const world = worldRows[0]!;
  const worldDef = world.schema as unknown as WorldDefinition;

  // Initialize engine state
  const stateManager = new GameStateManager(worldDef);
  const initialState = stateManager.getSnapshot();

  const result = await db
    .insert(playSessions)
    .values({
      userId: currentUser.id,
      worldId: body.worldId,
      state: initialState as unknown as Record<string, unknown>,
    })
    .returning();

  const session = result[0]!;

  // Insert greeting message if the world has one
  if (worldDef.settings?.greeting) {
    const greeting = new (await import("@yumina/engine")).PromptBuilder().buildGreeting(
      worldDef,
      initialState
    );

    await db.insert(messages).values({
      sessionId: session.id,
      role: "assistant",
      content: greeting,
    });
  }

  return c.json({ data: session }, 201);
});

// GET /api/sessions — list user's sessions
sessionRoutes.get("/", async (c) => {
  const currentUser = c.get("user");

  const result = await db
    .select({
      id: playSessions.id,
      worldId: playSessions.worldId,
      worldName: worlds.name,
      state: playSessions.state,
      createdAt: playSessions.createdAt,
      updatedAt: playSessions.updatedAt,
    })
    .from(playSessions)
    .leftJoin(worlds, eq(playSessions.worldId, worlds.id))
    .where(eq(playSessions.userId, currentUser.id))
    .orderBy(desc(playSessions.updatedAt));

  return c.json({ data: result });
});

// GET /api/sessions/:id — get session with messages
sessionRoutes.get("/:id", async (c) => {
  const currentUser = c.get("user");
  const sessionId = c.req.param("id");

  const sessionRows = await db
    .select()
    .from(playSessions)
    .where(
      and(eq(playSessions.id, sessionId), eq(playSessions.userId, currentUser.id))
    );

  if (sessionRows.length === 0) {
    return c.json({ error: "Session not found" }, 404);
  }

  const sessionMessages = await db
    .select()
    .from(messages)
    .where(eq(messages.sessionId, sessionId))
    .orderBy(messages.createdAt);

  // Get world info
  const worldRows = await db
    .select()
    .from(worlds)
    .where(eq(worlds.id, sessionRows[0]!.worldId));

  return c.json({
    data: {
      ...sessionRows[0]!,
      world: worldRows[0] ?? null,
      messages: sessionMessages,
    },
  });
});

// DELETE /api/sessions/:id
sessionRoutes.delete("/:id", async (c) => {
  const currentUser = c.get("user");
  const sessionId = c.req.param("id");

  const result = await db
    .delete(playSessions)
    .where(
      and(eq(playSessions.id, sessionId), eq(playSessions.userId, currentUser.id))
    )
    .returning({ id: playSessions.id });

  if (result.length === 0) {
    return c.json({ error: "Session not found" }, 404);
  }

  return c.json({ data: { deleted: true } });
});

// PATCH /api/sessions/:id/state — update session state
sessionRoutes.patch("/:id/state", async (c) => {
  const currentUser = c.get("user");
  const sessionId = c.req.param("id");
  const body = await c.req.json<{ state: Record<string, unknown> }>();

  const result = await db
    .update(playSessions)
    .set({ state: body.state, updatedAt: new Date() })
    .where(
      and(eq(playSessions.id, sessionId), eq(playSessions.userId, currentUser.id))
    )
    .returning();

  if (result.length === 0) {
    return c.json({ error: "Session not found" }, 404);
  }

  return c.json({ data: result[0] });
});

// POST /api/sessions/:id/extract-memories — extract persistent memories from session
sessionRoutes.post("/:id/extract-memories", async (c) => {
  const currentUser = c.get("user");
  const sessionId = c.req.param("id");

  const sessionRows = await db
    .select()
    .from(playSessions)
    .where(
      and(eq(playSessions.id, sessionId), eq(playSessions.userId, currentUser.id))
    );

  if (sessionRows.length === 0) {
    return c.json({ error: "Session not found" }, 404);
  }

  const session = sessionRows[0]!;

  // Need an OpenAI key for the extraction model
  const keyRows = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.userId, currentUser.id), eq(apiKeys.provider, "openai")));

  if (keyRows.length === 0) {
    // Try openrouter as fallback
    const orKeys = await db
      .select()
      .from(apiKeys)
      .where(and(eq(apiKeys.userId, currentUser.id), eq(apiKeys.provider, "openrouter")));

    if (orKeys.length === 0) {
      return c.json({ error: "API key required for memory extraction" }, 400);
    }

    const apiKey = decryptApiKey(orKeys[0]!.encryptedKey, orKeys[0]!.keyIv, orKeys[0]!.keyTag);
    const memories = await extractMemories(sessionId, session.worldId, currentUser.id, apiKey);
    return c.json({ data: { extracted: memories.length, memories } });
  }

  const apiKey = decryptApiKey(keyRows[0]!.encryptedKey, keyRows[0]!.keyIv, keyRows[0]!.keyTag);
  const memories = await extractMemories(sessionId, session.worldId, currentUser.id, apiKey);
  return c.json({ data: { extracted: memories.length, memories } });
});

// GET /api/sessions/:id/memories — get persistent memories for this world+user
sessionRoutes.get("/:id/memories", async (c) => {
  const currentUser = c.get("user");
  const sessionId = c.req.param("id");

  const sessionRows = await db
    .select()
    .from(playSessions)
    .where(
      and(eq(playSessions.id, sessionId), eq(playSessions.userId, currentUser.id))
    );

  if (sessionRows.length === 0) {
    return c.json({ error: "Session not found" }, 404);
  }

  const memories = await loadWorldMemories(sessionRows[0]!.worldId, currentUser.id);
  return c.json({ data: memories });
});

// DELETE /api/worlds/:worldId/memories — clear all memories for a world
sessionRoutes.delete("/worlds/:worldId/memories", async (c) => {
  const currentUser = c.get("user");
  const worldId = c.req.param("worldId");

  await db
    .delete(worldMemories)
    .where(
      and(eq(worldMemories.worldId, worldId), eq(worldMemories.userId, currentUser.id))
    );

  return c.json({ data: { cleared: true } });
});

export { sessionRoutes };
