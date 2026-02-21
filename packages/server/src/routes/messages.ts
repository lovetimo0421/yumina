import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { eq, and } from "drizzle-orm";
import { db } from "../db/index.js";
import { messages, playSessions, worlds, apiKeys } from "../db/schema.js";
import { authMiddleware } from "../middleware/auth.js";
import { decryptApiKey } from "../lib/crypto.js";
import { createProvider, inferProvider } from "../lib/llm/provider-factory.js";
import type { ProviderName } from "../lib/llm/provider-factory.js";
import {
  GameStateManager,
  RulesEngine,
  PromptBuilder,
  ResponseParser,
  StructuredResponseParser,
  migrateWorldDefinition,
} from "@yumina/engine";
import type { WorldDefinition, GameState, AudioEffect } from "@yumina/engine";
import type { AppEnv } from "../lib/types.js";
import { retrieveLorebookEntries } from "../lib/lorebook-retriever.js";
import { compactSessionIfNeeded } from "../lib/session-compactor.js";
import { loadWorldMemories } from "../lib/memory-extractor.js";

const messageRoutes = new Hono<AppEnv>();

messageRoutes.use("/*", authMiddleware);

const rulesEngine = new RulesEngine();
const promptBuilder = new PromptBuilder();
const responseParser = new ResponseParser();
const structuredParser = new StructuredResponseParser();

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

// Helper: resolve provider and API key for a model (falls back to OpenRouter)
async function resolveProviderForModel(userId: string, modelId: string) {
  const providerName = inferProvider(modelId);
  const apiKey = await getUserApiKey(userId, providerName);
  if (apiKey) return { provider: createProvider(providerName, apiKey), providerName };

  // Fallback: try OpenRouter (supports all models via prefix/model IDs)
  if (providerName !== "openrouter") {
    const orKey = await getUserApiKey(userId, "openrouter");
    if (orKey) return { provider: createProvider("openrouter", orKey), providerName: "openrouter" as ProviderName };
  }

  return null;
}

// Helper: load session with world definition (applies migration)
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

  const rawWorldDef = worldRows[0]!.schema as unknown as WorldDefinition;
  const worldDef = migrateWorldDefinition(rawWorldDef);
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
    overrides?: {
      maxTokens?: number;
      maxContext?: number;
      temperature?: number;
    };
  }>();

  if (!body.content) {
    return c.json({ error: "Content is required" }, 400);
  }

  const context = await loadSessionContext(sessionId, currentUser.id);
  if (!context) {
    return c.json({ error: "Session not found" }, 404);
  }

  const { session: sessionData, worldDef, gameState } = context;
  const model = body.model ?? "openai/gpt-4o-mini";

  const resolved = await resolveProviderForModel(currentUser.id, model);
  if (!resolved) {
    return c.json({ error: "No API key configured for this provider. Add one in Settings." }, 400);
  }

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

  // Session compaction — check if we need to summarize old messages
  // Use a reasonable context estimate (most models: 128K, fallback 16K)
  const contextWindowTokens = 128000;
  const compactionApiKey = await getUserApiKey(currentUser.id, "openai") ??
    await getUserApiKey(currentUser.id, "openrouter");
  if (compactionApiKey) {
    await compactSessionIfNeeded(sessionId, contextWindowTokens, compactionApiKey);
  }

  // Build prompt
  const stateManager = new GameStateManager(worldDef, gameState);
  stateManager.incrementTurn();

  const useStructured = worldDef.settings?.structuredOutput === true;
  const snapshot = stateManager.getSnapshot();

  // Load non-compacted message history for AI prompt (compacted ones excluded)
  const historyRows = await db
    .select()
    .from(messages)
    .where(and(eq(messages.sessionId, sessionId), eq(messages.compacted, false)))
    .orderBy(messages.createdAt);

  // Load session summary (from compaction) and persistent memories
  const sessionRows = await db
    .select()
    .from(playSessions)
    .where(eq(playSessions.id, sessionId));
  const sessionSummary = sessionRows[0]?.summary;

  const worldMemoriesList = await loadWorldMemories(
    sessionData.worldId,
    currentUser.id
  );

  // Deterministic entry retrieval (engine-level matching)
  // Clamp helper
  const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

  const scanDepth = worldDef.settings?.lorebookScanDepth ?? 2;
  const maxContext = clamp(body.overrides?.maxContext ?? worldDef.settings?.maxContext ?? 200000, 4096, 2000000);
  const budgetPercent = worldDef.settings?.lorebookBudgetPercent ?? 100;
  const budgetCap = worldDef.settings?.lorebookBudgetCap ?? 0;
  let tokenBudget = Math.round((budgetPercent * maxContext) / 100);
  if (budgetCap > 0) tokenBudget = Math.min(tokenBudget, budgetCap);
  const recentTexts = historyRows.slice(-scanDepth).map((m) => m.content);
  const lorebookResult = retrieveLorebookEntries({
    entries: worldDef.entries,
    recentMessages: recentTexts,
    state: snapshot,
    tokenBudget,
    settings: { lorebookRecursionDepth: worldDef.settings?.lorebookRecursionDepth },
  });
  const matchedEntries = [...lorebookResult.alwaysSend, ...lorebookResult.triggered];

  const systemPrompt = useStructured
    ? promptBuilder.buildStructuredSystemPrompt(worldDef, snapshot, matchedEntries)
    : promptBuilder.buildSystemPrompt(worldDef, snapshot, matchedEntries);

  // Build context-aware message list
  const contextMessages: Array<{ role: "user" | "assistant" | "system"; content: string }> = [];

  // 1. System prompt
  contextMessages.push({ role: "system", content: systemPrompt });

  // 2. Session summary (from compaction of older messages)
  if (sessionSummary) {
    contextMessages.push({
      role: "system",
      content: `Previous session context (summarized):\n${sessionSummary}`,
    });
  }

  // 3. Persistent memories from past sessions
  if (worldMemoriesList.length > 0) {
    const memoryText = worldMemoriesList
      .map((m) => `- [${m.category}] ${m.content}`)
      .join("\n");
    contextMessages.push({
      role: "system",
      content: `Memories from previous sessions:\n${memoryText}`,
    });
  }

  // 4. Actual message history (with depth entries injected)
  const depthEntries = promptBuilder.buildDepthEntries(worldDef, snapshot, matchedEntries);
  const historyMessages = historyRows.map((m) => ({
    role: m.role as "user" | "assistant" | "system",
    content: m.content,
  }));

  // Inject depth entries at their specified positions from the end
  for (const de of depthEntries) {
    const insertIdx = Math.max(0, historyMessages.length - de.depth);
    historyMessages.splice(insertIdx, 0, {
      role: "system" as const,
      content: de.content,
    });
  }

  contextMessages.push(...historyMessages);

  // 5. Post-history entries (jailbreak / post-history instructions — after all chat)
  const postHistoryParts = promptBuilder.buildPostHistoryEntries(worldDef, snapshot, matchedEntries);
  for (const part of postHistoryParts) {
    contextMessages.push({ role: "system", content: part });
  }

  const chatMessages = promptBuilder.buildMessageHistory(
    contextMessages,
    maxContext
  );

  // Stream response
  const provider = resolved.provider;
  const startTime = Date.now();

  return streamSSE(c, async (stream) => {
    let fullContent = "";

    try {
      for await (const chunk of provider.generateStream({
        model,
        messages: chatMessages,
        maxTokens: clamp(body.overrides?.maxTokens ?? worldDef.settings?.maxTokens ?? 4096, 256, 32768),
        temperature: clamp(body.overrides?.temperature ?? worldDef.settings?.temperature ?? 1.0, 0, 2),
        topP: worldDef.settings?.topP,
        frequencyPenalty: worldDef.settings?.frequencyPenalty,
        presencePenalty: worldDef.settings?.presencePenalty,
        topK: worldDef.settings?.topK,
        minP: worldDef.settings?.minP,
        ...(useStructured && {
          responseFormat: { type: "json_object" as const },
        }),
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

          // Parse response — structured JSON or regex fallback
          let cleanText: string;
          let effects: import("@yumina/engine").Effect[];
          let choices: string[] = [];
          let parserAudioEffects: AudioEffect[] = [];

          if (useStructured) {
            const result = structuredParser.parse(fullContent);
            cleanText = result.cleanText;
            effects = result.effects;
            choices = result.choices;
            parserAudioEffects = result.audioEffects;
            // If structured parse returned raw text (JSON failed), fall back to regex
            if (effects.length === 0 && result.cleanText === fullContent) {
              const regexResult = responseParser.parse(fullContent);
              cleanText = regexResult.cleanText;
              effects = regexResult.effects;
              parserAudioEffects = regexResult.audioEffects;
            }
          } else {
            const result = responseParser.parse(fullContent);
            cleanText = result.cleanText;
            effects = result.effects;
            parserAudioEffects = result.audioEffects;
          }

          const changes = stateManager.applyEffects(effects);

          // Evaluate rules
          const { effects: ruleEffects, audioEffects: ruleAudioEffects } = rulesEngine.evaluate(
            stateManager.getSnapshot(),
            worldDef.rules
          );
          const ruleChanges = stateManager.applyEffects(ruleEffects);
          const allChanges = [...changes, ...ruleChanges];

          // Collect all audio effects
          const allAudioEffects = [...parserAudioEffects, ...ruleAudioEffects];
          if (allAudioEffects.length > 0) {
            stateManager.setMetadata("activeAudio", allAudioEffects);
          }

          const finalState = stateManager.getSnapshot();

          // Save assistant message
          const assistantMsgResult = await db
            .insert(messages)
            .values({
              sessionId,
              role: "assistant",
              content: cleanText,
              stateChanges:
                allChanges.length > 0
                  ? (allChanges as unknown as Record<string, unknown>)
                  : null,
              model,
              tokenCount: chunk.usage?.totalTokens ?? null,
              generationTimeMs,
              swipes: [
                {
                  content: cleanText,
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
              choices,
              audioEffects: allAudioEffects.length > 0 ? allAudioEffects : undefined,
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
  const body = (await c.req.json().catch(() => ({}))) as {
    model?: string;
    overrides?: {
      maxTokens?: number;
      maxContext?: number;
      temperature?: number;
    };
  };

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

  const { worldDef, gameState } = context;
  const model = body.model ?? "openai/gpt-4o-mini";

  const resolved = await resolveProviderForModel(currentUser.id, model);
  if (!resolved) {
    return c.json({ error: "No API key configured for this provider" }, 400);
  }

  const stateManager = new GameStateManager(worldDef, gameState);
  const useStructured = worldDef.settings?.structuredOutput === true;
  const snapshot = stateManager.getSnapshot();

  // Get non-compacted messages up to (but not including) the one being regenerated
  const historyRows = await db
    .select()
    .from(messages)
    .where(and(eq(messages.sessionId, msg.sessionId), eq(messages.compacted, false)))
    .orderBy(messages.createdAt);

  const msgIndex = historyRows.findIndex((m) => m.id === messageId);
  const priorMessages = historyRows.slice(0, msgIndex);

  // Deterministic entry retrieval (engine-level matching)
  const regenClamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
  const scanDepth = worldDef.settings?.lorebookScanDepth ?? 2;
  const regenMaxContext = regenClamp(body.overrides?.maxContext ?? worldDef.settings?.maxContext ?? 200000, 4096, 2000000);
  const regenBudgetPercent = worldDef.settings?.lorebookBudgetPercent ?? 100;
  const regenBudgetCap = worldDef.settings?.lorebookBudgetCap ?? 0;
  let tokenBudget = Math.round((regenBudgetPercent * regenMaxContext) / 100);
  if (regenBudgetCap > 0) tokenBudget = Math.min(tokenBudget, regenBudgetCap);
  const recentTexts = priorMessages.slice(-scanDepth).map((m) => m.content);
  const lorebookResult = retrieveLorebookEntries({
    entries: worldDef.entries,
    recentMessages: recentTexts,
    state: snapshot,
    tokenBudget,
    settings: { lorebookRecursionDepth: worldDef.settings?.lorebookRecursionDepth },
  });
  const matchedEntries = [...lorebookResult.alwaysSend, ...lorebookResult.triggered];

  const systemPrompt = useStructured
    ? promptBuilder.buildStructuredSystemPrompt(worldDef, snapshot, matchedEntries)
    : promptBuilder.buildSystemPrompt(worldDef, snapshot, matchedEntries);

  const chatMessages = promptBuilder.buildMessageHistory(
    [
      { role: "system" as const, content: systemPrompt },
      ...priorMessages.map((m) => ({
        role: m.role as "user" | "assistant" | "system",
        content: m.content,
      })),
    ],
    regenMaxContext
  );

  const regenProvider = resolved.provider;
  const startTime = Date.now();

  return streamSSE(c, async (stream) => {
    let fullContent = "";

    try {
      for await (const chunk of regenProvider.generateStream({
        model,
        messages: chatMessages,
        maxTokens: regenClamp(body.overrides?.maxTokens ?? worldDef.settings?.maxTokens ?? 4096, 256, 32768),
        temperature: regenClamp(body.overrides?.temperature ?? worldDef.settings?.temperature ?? 1.0, 0, 2),
        topP: worldDef.settings?.topP,
        frequencyPenalty: worldDef.settings?.frequencyPenalty,
        presencePenalty: worldDef.settings?.presencePenalty,
        topK: worldDef.settings?.topK,
        minP: worldDef.settings?.minP,
        ...(useStructured && {
          responseFormat: { type: "json_object" as const },
        }),
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

          // Parse response — structured JSON or regex fallback
          let cleanText: string;
          let effects: import("@yumina/engine").Effect[];
          let choices: string[] = [];
          let regenParserAudioEffects: AudioEffect[] = [];

          if (useStructured) {
            const result = structuredParser.parse(fullContent);
            cleanText = result.cleanText;
            effects = result.effects;
            choices = result.choices;
            regenParserAudioEffects = result.audioEffects;
            if (effects.length === 0 && result.cleanText === fullContent) {
              const regexResult = responseParser.parse(fullContent);
              cleanText = regexResult.cleanText;
              effects = regexResult.effects;
              regenParserAudioEffects = regexResult.audioEffects;
            }
          } else {
            const result = responseParser.parse(fullContent);
            cleanText = result.cleanText;
            effects = result.effects;
            regenParserAudioEffects = result.audioEffects;
          }

          const changes = stateManager.applyEffects(effects);
          const { effects: regenRuleEffects, audioEffects: regenRuleAudioEffects } = rulesEngine.evaluate(
            stateManager.getSnapshot(),
            worldDef.rules
          );
          const ruleChanges = stateManager.applyEffects(regenRuleEffects);
          const allChanges = [...changes, ...ruleChanges];

          const allRegenAudioEffects = [...regenParserAudioEffects, ...regenRuleAudioEffects];
          if (allRegenAudioEffects.length > 0) {
            stateManager.setMetadata("activeAudio", allRegenAudioEffects);
          }

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
            content: cleanText,
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
              content: cleanText,
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
              choices,
              audioEffects: allRegenAudioEffects.length > 0 ? allRegenAudioEffects : undefined,
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

// ── Model listing with cache and categorization ──

const CURATED_MODEL_IDS = new Set([
  "google/gemini-3.1-pro",
  "anthropic/claude-sonnet-4",
  "openai/gpt-4o",
]);

function getProvider(modelId: string): string {
  const prefix = modelId.split("/")[0] ?? "unknown";
  const map: Record<string, string> = {
    anthropic: "Anthropic",
    openai: "OpenAI",
    google: "Google",
    "meta-llama": "Meta",
    mistralai: "Mistral",
    deepseek: "DeepSeek",
    cohere: "Cohere",
    "nousresearch": "Nous Research",
  };
  return map[prefix] ?? prefix;
}

interface CachedModel {
  id: string;
  name: string;
  provider: string;
  contextLength: number;
  pricing?: { prompt: number; completion: number };
  isCurated: boolean;
}

let modelCache: CachedModel[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// GET /api/models — list available models with caching and categorization
messageRoutes.get("/models", async (c) => {
  const currentUser = c.get("user");
  const now = Date.now();

  // Return cache if fresh
  if (modelCache && now - cacheTimestamp < CACHE_TTL) {
    const curated = modelCache.filter((m) => m.isCurated);
    return c.json({ data: { curated, all: modelCache } });
  }

  // Gather keys for all providers the user has
  const allKeys = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.userId, currentUser.id));

  if (allKeys.length === 0) {
    const fallback: CachedModel[] = [...CURATED_MODEL_IDS].map((id) => ({
      id,
      name: id.split("/")[1]?.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) ?? id,
      provider: getProvider(id),
      contextLength: 0,
      isCurated: true,
    }));
    return c.json({ data: { curated: fallback, all: fallback } });
  }

  try {
    const allModels: CachedModel[] = [];

    for (const keyRow of allKeys) {
      try {
        const decrypted = decryptApiKey(keyRow.encryptedKey, keyRow.keyIv, keyRow.keyTag);
        const llmProvider = createProvider(keyRow.provider as ProviderName, decrypted);
        const rawModels = await llmProvider.listModels();

        for (const m of rawModels) {
          allModels.push({
            id: m.id,
            name: m.name,
            provider: getProvider(m.id),
            contextLength: m.contextLength,
            pricing: m.pricing,
            isCurated: CURATED_MODEL_IDS.has(m.id),
          });
        }
      } catch {
        // Skip providers that fail to list models
      }
    }

    // Deduplicate by model ID (prefer the first occurrence)
    const seen = new Set<string>();
    modelCache = allModels.filter((m) => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });
    cacheTimestamp = now;

    const curated = modelCache.filter((m) => m.isCurated);
    return c.json({ data: { curated, all: modelCache } });
  } catch {
    return c.json({ error: "Failed to fetch models" }, 500);
  }
});

export { messageRoutes };
