import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { eq, and } from "drizzle-orm";
import { db } from "../db/index.js";
import { messages, playSessions, worlds, apiKeys } from "../db/schema.js";
import { authMiddleware } from "../middleware/auth.js";
import { decryptApiKey } from "../lib/crypto.js";
import { OpenRouterProvider } from "../lib/llm/openrouter.js";
import {
  GameStateManager,
  RulesEngine,
  PromptBuilder,
  ResponseParser,
} from "@yumina/engine";
import type { WorldDefinition, GameState } from "@yumina/engine";
import type { AppEnv } from "../lib/types.js";

const messageRoutes = new Hono<AppEnv>();

messageRoutes.use("/*", authMiddleware);

const rulesEngine = new RulesEngine();
const promptBuilder = new PromptBuilder();
const responseParser = new ResponseParser();

// Helper: get user's active API key for a provider
async function getUserApiKey(userId: string, provider = "openrouter") {
  const rows = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.userId, userId), eq(apiKeys.provider, provider)));

  if (rows.length === 0) return null;
  const row = rows[0]!;
  return decryptApiKey(row.encryptedKey, row.keyIv, row.keyTag);
}

// Helper: load session with world definition
async function loadSessionContext(sessionId: string, userId: string) {
  const sessionRows = await db
    .select()
    .from(playSessions)
    .where(
      and(eq(playSessions.id, sessionId), eq(playSessions.userId, userId))
    );

  if (sessionRows.length === 0) return null;

  const session = sessionRows[0]!;
  const worldRows = await db
    .select()
    .from(worlds)
    .where(eq(worlds.id, session.worldId));

  if (worldRows.length === 0) return null;

  const worldDef = worldRows[0]!.schema as unknown as WorldDefinition;
  const gameState = session.state as unknown as GameState;

  return { session, worldDef, gameState };
}

// GET /api/sessions/:sessionId/messages — get messages for session
messageRoutes.get("/sessions/:sessionId/messages", async (c) => {
  const currentUser = c.get("user");
  const sessionId = c.req.param("sessionId");

  // Verify session ownership
  const sessionRows = await db
    .select()
    .from(playSessions)
    .where(
      and(
        eq(playSessions.id, sessionId),
        eq(playSessions.userId, currentUser.id)
      )
    );

  if (sessionRows.length === 0) {
    return c.json({ error: "Session not found" }, 404);
  }

  const result = await db
    .select()
    .from(messages)
    .where(eq(messages.sessionId, sessionId))
    .orderBy(messages.createdAt);

  return c.json({ data: result });
});

// POST /api/sessions/:sessionId/messages — send user message + trigger AI generation (SSE)
messageRoutes.post("/sessions/:sessionId/messages", async (c) => {
  const currentUser = c.get("user");
  const sessionId = c.req.param("sessionId");
  const body = await c.req.json<{
    content: string;
    model?: string;
  }>();

  if (!body.content) {
    return c.json({ error: "Content is required" }, 400);
  }

  const context = await loadSessionContext(sessionId, currentUser.id);
  if (!context) {
    return c.json({ error: "Session not found" }, 404);
  }

  const apiKey = await getUserApiKey(currentUser.id);
  if (!apiKey) {
    return c.json({ error: "No API key configured. Add one in Settings." }, 400);
  }

  const { worldDef, gameState } = context;
  const model =
    body.model ?? worldDef.settings?.maxTokens
      ? "openai/gpt-4o-mini"
      : "openai/gpt-4o-mini";

  // Save user message
  const userMsgResult = await db
    .insert(messages)
    .values({
      sessionId,
      role: "user",
      content: body.content,
    })
    .returning();

  const userMsg = userMsgResult[0]!;

  // Build prompt
  const stateManager = new GameStateManager(worldDef, gameState);
  stateManager.incrementTurn();

  const activeChar =
    worldDef.characters.find(
      (ch) => ch.id === gameState.activeCharacterId
    ) ?? worldDef.characters[0];

  if (!activeChar) {
    return c.json({ error: "No character defined in world" }, 400);
  }

  const systemPrompt = promptBuilder.buildSystemPrompt(
    worldDef,
    activeChar,
    stateManager.getSnapshot()
  );

  // Load message history
  const historyRows = await db
    .select()
    .from(messages)
    .where(eq(messages.sessionId, sessionId))
    .orderBy(messages.createdAt);

  const chatMessages = promptBuilder.buildMessageHistory(
    [
      { role: "system" as const, content: systemPrompt },
      ...historyRows.map((m) => ({
        role: m.role as "user" | "assistant" | "system",
        content: m.content,
      })),
    ],
    worldDef.settings?.maxTokens
  );

  // Stream response
  const provider = new OpenRouterProvider(apiKey);
  const startTime = Date.now();

  return streamSSE(c, async (stream) => {
    let fullContent = "";

    try {
      for await (const chunk of provider.generateStream({
        model,
        messages: chatMessages,
        maxTokens: worldDef.settings?.maxTokens ?? 2048,
        temperature: worldDef.settings?.temperature ?? 0.8,
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
          const generationTimeMs = Date.now() - startTime;

          // Parse response for state changes
          const parsed = responseParser.parse(fullContent);
          const changes = stateManager.applyEffects(parsed.effects);

          // Evaluate rules
          const ruleEffects = rulesEngine.evaluate(
            stateManager.getSnapshot(),
            worldDef.rules
          );
          const ruleChanges = stateManager.applyEffects(ruleEffects);
          const allChanges = [...changes, ...ruleChanges];

          const finalState = stateManager.getSnapshot();

          // Save assistant message
          const assistantMsgResult = await db
            .insert(messages)
            .values({
              sessionId,
              role: "assistant",
              content: parsed.cleanText,
              stateChanges:
                allChanges.length > 0
                  ? (allChanges as unknown as Record<string, unknown>)
                  : null,
              model,
              tokenCount: chunk.usage?.totalTokens ?? null,
              generationTimeMs,
              swipes: [
                {
                  content: parsed.cleanText,
                  stateChanges:
                    allChanges.length > 0
                      ? (allChanges as unknown as Record<string, unknown>)
                      : undefined,
                  createdAt: new Date().toISOString(),
                  model,
                  tokenCount: chunk.usage?.totalTokens,
                },
              ],
              activeSwipeIndex: 0,
            })
            .returning();

          const assistantMsg = assistantMsgResult[0]!;

          // Update session state
          await db
            .update(playSessions)
            .set({
              state: finalState as unknown as Record<string, unknown>,
              updatedAt: new Date(),
            })
            .where(eq(playSessions.id, sessionId));

          await stream.writeSSE({
            event: "done",
            data: JSON.stringify({
              messageId: assistantMsg.id,
              userMessageId: userMsg.id,
              stateChanges: allChanges,
              state: finalState,
              tokenCount: chunk.usage?.totalTokens ?? null,
              generationTimeMs,
            }),
          });
        }
      }
    } catch (err) {
      await stream.writeSSE({
        event: "error",
        data: JSON.stringify({
          error: err instanceof Error ? err.message : "Generation failed",
        }),
      });
    }
  });
});

// PATCH /api/messages/:id — edit a message
messageRoutes.patch("/messages/:id", async (c) => {
  const currentUser = c.get("user");
  const messageId = c.req.param("id");
  const body = await c.req.json<{ content: string }>();

  // Verify ownership via session
  const msgRows = await db
    .select()
    .from(messages)
    .where(eq(messages.id, messageId));

  if (msgRows.length === 0) {
    return c.json({ error: "Message not found" }, 404);
  }

  const msg = msgRows[0]!;
  const sessionRows = await db
    .select()
    .from(playSessions)
    .where(
      and(
        eq(playSessions.id, msg.sessionId),
        eq(playSessions.userId, currentUser.id)
      )
    );

  if (sessionRows.length === 0) {
    return c.json({ error: "Not authorized" }, 403);
  }

  const result = await db
    .update(messages)
    .set({ content: body.content })
    .where(eq(messages.id, messageId))
    .returning();

  return c.json({ data: result[0] });
});

// DELETE /api/messages/:id
messageRoutes.delete("/messages/:id", async (c) => {
  const currentUser = c.get("user");
  const messageId = c.req.param("id");

  const msgRows = await db
    .select()
    .from(messages)
    .where(eq(messages.id, messageId));

  if (msgRows.length === 0) {
    return c.json({ error: "Message not found" }, 404);
  }

  const msg = msgRows[0]!;
  const sessionRows = await db
    .select()
    .from(playSessions)
    .where(
      and(
        eq(playSessions.id, msg.sessionId),
        eq(playSessions.userId, currentUser.id)
      )
    );

  if (sessionRows.length === 0) {
    return c.json({ error: "Not authorized" }, 403);
  }

  await db.delete(messages).where(eq(messages.id, messageId));

  return c.json({ data: { deleted: true } });
});

// POST /api/messages/:id/regenerate — regenerate AI response (new swipe replaces current)
messageRoutes.post("/messages/:id/regenerate", async (c) => {
  const currentUser = c.get("user");
  const messageId = c.req.param("id");
  const body = (await c.req.json().catch(() => ({}))) as { model?: string };

  const msgRows = await db
    .select()
    .from(messages)
    .where(eq(messages.id, messageId));

  if (msgRows.length === 0 || msgRows[0]!.role !== "assistant") {
    return c.json({ error: "Assistant message not found" }, 404);
  }

  const msg = msgRows[0]!;
  const sessionRows = await db
    .select()
    .from(playSessions)
    .where(
      and(
        eq(playSessions.id, msg.sessionId),
        eq(playSessions.userId, currentUser.id)
      )
    );

  if (sessionRows.length === 0) {
    return c.json({ error: "Not authorized" }, 403);
  }

  const context = await loadSessionContext(msg.sessionId, currentUser.id);
  if (!context) {
    return c.json({ error: "Session context not found" }, 404);
  }

  const apiKey = await getUserApiKey(currentUser.id);
  if (!apiKey) {
    return c.json({ error: "No API key configured" }, 400);
  }

  const { worldDef, gameState } = context;
  const model = body.model ?? "openai/gpt-4o-mini";

  const stateManager = new GameStateManager(worldDef, gameState);

  const activeChar =
    worldDef.characters.find(
      (ch) => ch.id === gameState.activeCharacterId
    ) ?? worldDef.characters[0];

  if (!activeChar) {
    return c.json({ error: "No character defined" }, 400);
  }

  const systemPrompt = promptBuilder.buildSystemPrompt(
    worldDef,
    activeChar,
    stateManager.getSnapshot()
  );

  // Get messages up to (but not including) the one being regenerated
  const historyRows = await db
    .select()
    .from(messages)
    .where(eq(messages.sessionId, msg.sessionId))
    .orderBy(messages.createdAt);

  const msgIndex = historyRows.findIndex((m) => m.id === messageId);
  const priorMessages = historyRows.slice(0, msgIndex);

  const chatMessages = promptBuilder.buildMessageHistory(
    [
      { role: "system" as const, content: systemPrompt },
      ...priorMessages.map((m) => ({
        role: m.role as "user" | "assistant" | "system",
        content: m.content,
      })),
    ],
    worldDef.settings?.maxTokens
  );

  const provider = new OpenRouterProvider(apiKey);
  const startTime = Date.now();

  return streamSSE(c, async (stream) => {
    let fullContent = "";

    try {
      for await (const chunk of provider.generateStream({
        model,
        messages: chatMessages,
        maxTokens: worldDef.settings?.maxTokens ?? 2048,
        temperature: worldDef.settings?.temperature ?? 0.8,
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
          const generationTimeMs = Date.now() - startTime;
          const parsed = responseParser.parse(fullContent);
          const changes = stateManager.applyEffects(parsed.effects);
          const ruleEffects = rulesEngine.evaluate(
            stateManager.getSnapshot(),
            worldDef.rules
          );
          const ruleChanges = stateManager.applyEffects(ruleEffects);
          const allChanges = [...changes, ...ruleChanges];
          const finalState = stateManager.getSnapshot();

          // Add as new swipe
          const existingSwipes = (msg.swipes ?? []) as Array<{
            content: string;
            stateChanges?: Record<string, unknown>;
            createdAt: string;
            model?: string;
            tokenCount?: number;
          }>;
          const newSwipe = {
            content: parsed.cleanText,
            stateChanges:
              allChanges.length > 0
                ? (allChanges as unknown as Record<string, unknown>)
                : undefined,
            createdAt: new Date().toISOString(),
            model,
            tokenCount: chunk.usage?.totalTokens,
          };
          const updatedSwipes = [...existingSwipes, newSwipe];

          await db
            .update(messages)
            .set({
              content: parsed.cleanText,
              stateChanges:
                allChanges.length > 0
                  ? (allChanges as unknown as Record<string, unknown>)
                  : null,
              swipes: updatedSwipes,
              activeSwipeIndex: updatedSwipes.length - 1,
              model,
              tokenCount: chunk.usage?.totalTokens ?? null,
              generationTimeMs,
            })
            .where(eq(messages.id, messageId));

          // Update session state
          await db
            .update(playSessions)
            .set({
              state: finalState as unknown as Record<string, unknown>,
              updatedAt: new Date(),
            })
            .where(eq(playSessions.id, msg.sessionId));

          await stream.writeSSE({
            event: "done",
            data: JSON.stringify({
              messageId,
              stateChanges: allChanges,
              state: finalState,
              swipeIndex: updatedSwipes.length - 1,
              totalSwipes: updatedSwipes.length,
              tokenCount: chunk.usage?.totalTokens ?? null,
              generationTimeMs,
            }),
          });
        }
      }
    } catch (err) {
      await stream.writeSSE({
        event: "error",
        data: JSON.stringify({
          error: err instanceof Error ? err.message : "Regeneration failed",
        }),
      });
    }
  });
});

// POST /api/messages/:id/swipe — switch to a specific swipe index or generate new
messageRoutes.post("/messages/:id/swipe", async (c) => {
  const currentUser = c.get("user");
  const messageId = c.req.param("id");
  const body = await c.req.json<{ direction: "left" | "right" }>();

  const msgRows = await db
    .select()
    .from(messages)
    .where(eq(messages.id, messageId));

  if (msgRows.length === 0 || msgRows[0]!.role !== "assistant") {
    return c.json({ error: "Assistant message not found" }, 404);
  }

  const msg = msgRows[0]!;
  const sessionRows = await db
    .select()
    .from(playSessions)
    .where(
      and(
        eq(playSessions.id, msg.sessionId),
        eq(playSessions.userId, currentUser.id)
      )
    );

  if (sessionRows.length === 0) {
    return c.json({ error: "Not authorized" }, 403);
  }

  const swipes = (msg.swipes ?? []) as Array<{
    content: string;
    stateChanges?: Record<string, unknown>;
    createdAt: string;
    model?: string;
    tokenCount?: number;
  }>;
  const currentIndex = msg.activeSwipeIndex ?? 0;

  if (body.direction === "left") {
    if (currentIndex <= 0) {
      return c.json({ error: "Already at first swipe" }, 400);
    }

    const newIndex = currentIndex - 1;
    const swipe = swipes[newIndex]!;

    await db
      .update(messages)
      .set({
        content: swipe.content,
        activeSwipeIndex: newIndex,
        stateChanges: swipe.stateChanges ?? null,
        model: swipe.model ?? null,
        tokenCount: swipe.tokenCount ?? null,
      })
      .where(eq(messages.id, messageId));

    return c.json({
      data: {
        activeSwipeIndex: newIndex,
        totalSwipes: swipes.length,
        content: swipe.content,
        stateChanges: swipe.stateChanges,
      },
    });
  }

  // direction === "right"
  if (currentIndex < swipes.length - 1) {
    // Navigate to existing swipe
    const newIndex = currentIndex + 1;
    const swipe = swipes[newIndex]!;

    await db
      .update(messages)
      .set({
        content: swipe.content,
        activeSwipeIndex: newIndex,
        stateChanges: swipe.stateChanges ?? null,
        model: swipe.model ?? null,
        tokenCount: swipe.tokenCount ?? null,
      })
      .where(eq(messages.id, messageId));

    return c.json({
      data: {
        activeSwipeIndex: newIndex,
        totalSwipes: swipes.length,
        content: swipe.content,
        stateChanges: swipe.stateChanges,
      },
    });
  }

  // At the end — need to generate a new swipe. Redirect to regenerate.
  // Return a signal that the client should call regenerate instead.
  return c.json({
    data: {
      needsGeneration: true,
      activeSwipeIndex: currentIndex,
      totalSwipes: swipes.length,
    },
  });
});

// GET /api/models — list available models
messageRoutes.get("/models", async (c) => {
  const currentUser = c.get("user");

  const apiKey = await getUserApiKey(currentUser.id);
  if (!apiKey) {
    return c.json({ error: "No API key configured" }, 400);
  }

  const provider = new OpenRouterProvider(apiKey);
  const models = await provider.listModels();

  return c.json({ data: models });
});

export { messageRoutes };
