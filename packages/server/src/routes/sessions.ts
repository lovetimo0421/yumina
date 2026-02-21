import { Hono } from "hono";
import { eq, and, desc, asc } from "drizzle-orm";
import { db } from "../db/index.js";
import { playSessions, worlds, messages, apiKeys, worldMemories, checkpoints } from "../db/schema.js";
import { authMiddleware } from "../middleware/auth.js";
import { decryptApiKey } from "../lib/crypto.js";
import { extractMemories, loadWorldMemories } from "../lib/memory-extractor.js";
import type { AppEnv } from "../lib/types.js";
import type { WorldDefinition } from "@yumina/engine";
import { GameStateManager, PromptBuilder, migrateWorldDefinition } from "@yumina/engine";

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
  const rawWorldDef = world.schema as unknown as WorldDefinition;
  const worldDef = migrateWorldDefinition(rawWorldDef);

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

  // Insert greeting message if the world has a greeting entry
  const promptBuilder = new PromptBuilder();
  const greeting = promptBuilder.buildGreeting(worldDef, initialState);
  if (greeting) {
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

// POST /api/sessions/:id/revert — revert to a specific message (delete everything after it)
// Body: { messageId?: string } — if omitted, reverts the last assistant+user exchange
sessionRoutes.post("/:id/revert", async (c) => {
  const currentUser = c.get("user");
  const sessionId = c.req.param("id");
  const body = (await c.req.json().catch(() => ({}))) as { messageId?: string };

  // Verify ownership
  const sessionRows = await db
    .select()
    .from(playSessions)
    .where(and(eq(playSessions.id, sessionId), eq(playSessions.userId, currentUser.id)));

  if (sessionRows.length === 0) {
    return c.json({ error: "Session not found" }, 404);
  }

  const session = sessionRows[0]!;

  // Get ALL messages (including compacted) ordered by time
  const allMessages = await db
    .select()
    .from(messages)
    .where(eq(messages.sessionId, sessionId))
    .orderBy(asc(messages.createdAt));

  if (allMessages.length === 0) {
    return c.json({ error: "No messages to revert" }, 400);
  }

  let targetIdx: number;

  if (body.messageId) {
    // Revert to a specific message — keep this message, delete everything after
    targetIdx = allMessages.findIndex((m) => m.id === body.messageId);
    if (targetIdx === -1) {
      return c.json({ error: "Message not found" }, 404);
    }
  } else {
    // No messageId — revert the last exchange (find second-to-last assistant, or greeting)
    // Find the last assistant message
    let lastAssistantIdx = -1;
    for (let i = allMessages.length - 1; i >= 0; i--) {
      if (allMessages[i]!.role === "assistant") {
        lastAssistantIdx = i;
        break;
      }
    }
    if (lastAssistantIdx === -1) {
      return c.json({ error: "No assistant message to revert" }, 400);
    }

    // Target = the user message before the last assistant, or the message before the last pair
    // Effectively, find the message right before the user+assistant pair
    const userBeforeIdx = lastAssistantIdx > 0 && allMessages[lastAssistantIdx - 1]!.role === "user"
      ? lastAssistantIdx - 1
      : lastAssistantIdx;

    // Target is the message BEFORE the pair we want to delete
    targetIdx = userBeforeIdx - 1;

    if (targetIdx < 0) {
      // Nothing left — will reinitialize from world defaults
      targetIdx = -1;
    }
  }

  // Delete all messages after the target
  const toDelete = targetIdx >= 0 ? allMessages.slice(targetIdx + 1) : allMessages;

  if (toDelete.length === 0) {
    return c.json({ error: "Nothing to revert" }, 400);
  }

  for (const msg of toDelete) {
    await db.delete(messages).where(eq(messages.id, msg.id));
  }

  // Check if any compacted messages were deleted — if so, clear the summary (it's stale)
  const deletedCompacted = toDelete.some((m) => m.compacted);

  // Find the target message to restore state from
  const targetMsg = targetIdx >= 0 ? allMessages[targetIdx]! : null;

  let restoredState: Record<string, unknown>;

  if (targetMsg?.stateSnapshot) {
    restoredState = targetMsg.stateSnapshot as Record<string, unknown>;
  } else {
    // No snapshot available — re-initialize from world defaults
    const worldRows = await db.select().from(worlds).where(eq(worlds.id, session.worldId));
    if (worldRows.length === 0) return c.json({ error: "World not found" }, 404);

    const rawWorldDef = worldRows[0]!.schema as unknown as WorldDefinition;
    const worldDef = migrateWorldDefinition(rawWorldDef);
    const stateManager = new GameStateManager(worldDef);
    restoredState = stateManager.getSnapshot() as unknown as Record<string, unknown>;
  }

  // Update session state + clear summary if stale
  await db
    .update(playSessions)
    .set({
      state: restoredState,
      ...(deletedCompacted && { summary: null }),
      updatedAt: new Date(),
    })
    .where(eq(playSessions.id, sessionId));

  // Return remaining messages
  const updatedMessages = await db
    .select()
    .from(messages)
    .where(eq(messages.sessionId, sessionId))
    .orderBy(asc(messages.createdAt));

  return c.json({ data: { state: restoredState, messages: updatedMessages } });
});

// POST /api/sessions/:id/restart — full reset: clear messages, state, memories, re-insert greeting
sessionRoutes.post("/:id/restart", async (c) => {
  const currentUser = c.get("user");
  const sessionId = c.req.param("id");

  // Verify ownership
  const sessionRows = await db
    .select()
    .from(playSessions)
    .where(and(eq(playSessions.id, sessionId), eq(playSessions.userId, currentUser.id)));

  if (sessionRows.length === 0) {
    return c.json({ error: "Session not found" }, 404);
  }

  const session = sessionRows[0]!;

  // Load world definition
  const worldRows = await db.select().from(worlds).where(eq(worlds.id, session.worldId));
  if (worldRows.length === 0) return c.json({ error: "World not found" }, 404);

  const rawWorldDef = worldRows[0]!.schema as unknown as WorldDefinition;
  const worldDef = migrateWorldDefinition(rawWorldDef);

  // 1. Delete all messages
  await db.delete(messages).where(eq(messages.sessionId, sessionId));

  // 2. Clear world memories for this world+user
  await db
    .delete(worldMemories)
    .where(and(eq(worldMemories.worldId, session.worldId), eq(worldMemories.userId, currentUser.id)));

  // 3. Re-initialize state
  const stateManager = new GameStateManager(worldDef);
  const initialState = stateManager.getSnapshot();

  // 4. Reset session state + clear summary
  await db
    .update(playSessions)
    .set({
      state: initialState as unknown as Record<string, unknown>,
      summary: null,
      updatedAt: new Date(),
    })
    .where(eq(playSessions.id, sessionId));

  // 5. Re-insert greeting
  const promptBuilder = new PromptBuilder();
  const greeting = promptBuilder.buildGreeting(worldDef, initialState);
  let greetingMessage = null;
  if (greeting) {
    const result = await db
      .insert(messages)
      .values({
        sessionId,
        role: "assistant",
        content: greeting,
        stateSnapshot: initialState as unknown as Record<string, unknown>,
      })
      .returning();
    greetingMessage = result[0] ?? null;
  }

  return c.json({
    data: {
      state: initialState,
      messages: greetingMessage ? [greetingMessage] : [],
    },
  });
});

// ─── Checkpoints ────────────────────────────────────────────────────

// POST /api/sessions/:id/checkpoints — create checkpoint
sessionRoutes.post("/:id/checkpoints", async (c) => {
  const currentUser = c.get("user");
  const sessionId = c.req.param("id");

  // Verify ownership
  const sessionRows = await db
    .select()
    .from(playSessions)
    .where(and(eq(playSessions.id, sessionId), eq(playSessions.userId, currentUser.id)));

  if (sessionRows.length === 0) {
    return c.json({ error: "Session not found" }, 404);
  }

  const session = sessionRows[0]!;

  // Snapshot all messages
  const allMessages = await db
    .select()
    .from(messages)
    .where(eq(messages.sessionId, sessionId))
    .orderBy(asc(messages.createdAt));

  // Auto-name: "Checkpoint #N"
  const existingCheckpoints = await db
    .select()
    .from(checkpoints)
    .where(eq(checkpoints.sessionId, sessionId));

  const name = `Checkpoint #${existingCheckpoints.length + 1}`;

  const result = await db
    .insert(checkpoints)
    .values({
      sessionId,
      name,
      messages: allMessages as unknown as Array<Record<string, unknown>>,
      state: session.state as Record<string, unknown>,
      summary: session.summary,
    })
    .returning();

  return c.json({
    data: {
      ...result[0]!,
      messageCount: allMessages.length,
    },
  }, 201);
});

// GET /api/sessions/:id/checkpoints — list checkpoints for session
sessionRoutes.get("/:id/checkpoints", async (c) => {
  const currentUser = c.get("user");
  const sessionId = c.req.param("id");

  // Verify ownership
  const sessionRows = await db
    .select()
    .from(playSessions)
    .where(and(eq(playSessions.id, sessionId), eq(playSessions.userId, currentUser.id)));

  if (sessionRows.length === 0) {
    return c.json({ error: "Session not found" }, 404);
  }

  const result = await db
    .select()
    .from(checkpoints)
    .where(eq(checkpoints.sessionId, sessionId))
    .orderBy(desc(checkpoints.createdAt));

  // Return lightweight list (without full message snapshots)
  const list = result.map((cp) => ({
    id: cp.id,
    name: cp.name,
    messageCount: (cp.messages as unknown[]).length,
    createdAt: cp.createdAt,
  }));

  return c.json({ data: list });
});

// POST /api/sessions/:id/checkpoints/:checkpointId/restore — restore checkpoint
sessionRoutes.post("/:id/checkpoints/:checkpointId/restore", async (c) => {
  const currentUser = c.get("user");
  const sessionId = c.req.param("id");
  const checkpointId = c.req.param("checkpointId");

  // Verify ownership
  const sessionRows = await db
    .select()
    .from(playSessions)
    .where(and(eq(playSessions.id, sessionId), eq(playSessions.userId, currentUser.id)));

  if (sessionRows.length === 0) {
    return c.json({ error: "Session not found" }, 404);
  }

  // Load checkpoint
  const cpRows = await db
    .select()
    .from(checkpoints)
    .where(and(eq(checkpoints.id, checkpointId), eq(checkpoints.sessionId, sessionId)));

  if (cpRows.length === 0) {
    return c.json({ error: "Checkpoint not found" }, 404);
  }

  const checkpoint = cpRows[0]!;
  const snapshotMessages = checkpoint.messages as unknown as Array<Record<string, unknown>>;

  // Delete all current messages
  await db.delete(messages).where(eq(messages.sessionId, sessionId));

  // Re-insert messages from snapshot
  if (snapshotMessages.length > 0) {
    await db.insert(messages).values(
      snapshotMessages.map((m) => ({
        id: m.id as string,
        sessionId,
        role: m.role as "user" | "assistant" | "system",
        content: m.content as string,
        stateChanges: (m.stateChanges ?? null) as Record<string, unknown> | null,
        swipes: (Array.isArray(m.swipes) ? m.swipes : []) as Array<{
          content: string;
          stateChanges?: Record<string, unknown>;
          createdAt: string;
          model?: string;
          tokenCount?: number;
        }>,
        activeSwipeIndex: (m.activeSwipeIndex as number) ?? 0,
        model: (m.model as string) ?? null,
        tokenCount: (m.tokenCount as number) ?? null,
        generationTimeMs: (m.generationTimeMs as number) ?? null,
        compacted: (m.compacted as boolean) ?? false,
        stateSnapshot: (m.stateSnapshot ?? null) as Record<string, unknown> | null,
        attachments: (m.attachments ?? null) as Array<{ type: string; mimeType: string; name: string; url: string }> | null,
        createdAt: m.createdAt ? new Date(m.createdAt as string) : new Date(),
      }))
    );
  }

  // Restore session state + summary
  await db
    .update(playSessions)
    .set({
      state: checkpoint.state as Record<string, unknown>,
      summary: checkpoint.summary,
      updatedAt: new Date(),
    })
    .where(eq(playSessions.id, sessionId));

  // Return restored messages + state
  const restoredMessages = await db
    .select()
    .from(messages)
    .where(eq(messages.sessionId, sessionId))
    .orderBy(asc(messages.createdAt));

  return c.json({
    data: {
      state: checkpoint.state,
      messages: restoredMessages,
    },
  });
});

// DELETE /api/sessions/:id/checkpoints/:checkpointId — delete checkpoint
sessionRoutes.delete("/:id/checkpoints/:checkpointId", async (c) => {
  const currentUser = c.get("user");
  const sessionId = c.req.param("id");
  const checkpointId = c.req.param("checkpointId");

  // Verify ownership
  const sessionRows = await db
    .select()
    .from(playSessions)
    .where(and(eq(playSessions.id, sessionId), eq(playSessions.userId, currentUser.id)));

  if (sessionRows.length === 0) {
    return c.json({ error: "Session not found" }, 404);
  }

  const result = await db
    .delete(checkpoints)
    .where(and(eq(checkpoints.id, checkpointId), eq(checkpoints.sessionId, sessionId)))
    .returning({ id: checkpoints.id });

  if (result.length === 0) {
    return c.json({ error: "Checkpoint not found" }, 404);
  }

  return c.json({ data: { deleted: true } });
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
