import { Hono } from "hono";
import { eq, or, and } from "drizzle-orm";
import { db } from "../db/index.js";
import { worlds, lorebookEmbeddings, apiKeys } from "../db/schema.js";
import { authMiddleware } from "../middleware/auth.js";
import { decryptApiKey } from "../lib/crypto.js";
import { createWorldSchema, updateWorldSchema } from "@yumina/shared";
import { generateEmbeddings, hashContent } from "../lib/llm/embeddings.js";
import type { WorldDefinition } from "@yumina/engine";
import { migrateWorldDefinition } from "@yumina/engine";
import type { AppEnv } from "../lib/types.js";

const worldRoutes = new Hono<AppEnv>();

worldRoutes.use("/*", authMiddleware);

// GET /api/worlds — list user's worlds + published worlds
worldRoutes.get("/", async (c) => {
  const currentUser = c.get("user");
  const result = await db
    .select()
    .from(worlds)
    .where(
      or(eq(worlds.creatorId, currentUser.id), eq(worlds.isPublished, true))
    );

  return c.json({ data: result });
});

// GET /api/worlds/:id — get a single world
worldRoutes.get("/:id", async (c) => {
  const worldId = c.req.param("id");
  const result = await db.select().from(worlds).where(eq(worlds.id, worldId));

  if (result.length === 0) {
    return c.json({ error: "World not found" }, 404);
  }

  return c.json({ data: result[0] });
});

// POST /api/worlds
worldRoutes.post("/", async (c) => {
  const currentUser = c.get("user");
  const body = await c.req.json();
  const parsed = createWorldSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      400
    );
  }

  const result = await db
    .insert(worlds)
    .values({
      ...parsed.data,
      creatorId: currentUser.id,
    })
    .returning();

  return c.json({ data: result[0] }, 201);
});

// PATCH /api/worlds/:id — update world (owner only)
worldRoutes.patch("/:id", async (c) => {
  const currentUser = c.get("user");
  const worldId = c.req.param("id");
  const body = await c.req.json();

  const parsed = updateWorldSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      400
    );
  }

  const result = await db
    .update(worlds)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(worlds.id, worldId), eq(worlds.creatorId, currentUser.id)))
    .returning();

  if (result.length === 0) {
    return c.json({ error: "World not found or not authorized" }, 404);
  }

  return c.json({ data: result[0] });
});

// DELETE /api/worlds/:id — delete world (owner only, cascades sessions via FK)
worldRoutes.delete("/:id", async (c) => {
  const currentUser = c.get("user");
  const worldId = c.req.param("id");

  const result = await db
    .delete(worlds)
    .where(and(eq(worlds.id, worldId), eq(worlds.creatorId, currentUser.id)))
    .returning({ id: worlds.id });

  if (result.length === 0) {
    return c.json({ error: "World not found or not authorized" }, 404);
  }

  return c.json({ data: { deleted: true } });
});

// POST /api/worlds/:id/publish — toggle isPublished
worldRoutes.post("/:id/publish", async (c) => {
  const currentUser = c.get("user");
  const worldId = c.req.param("id");

  const existing = await db
    .select()
    .from(worlds)
    .where(and(eq(worlds.id, worldId), eq(worlds.creatorId, currentUser.id)));

  if (existing.length === 0) {
    return c.json({ error: "World not found or not authorized" }, 404);
  }

  const result = await db
    .update(worlds)
    .set({
      isPublished: !existing[0]!.isPublished,
      updatedAt: new Date(),
    })
    .where(eq(worlds.id, worldId))
    .returning();

  return c.json({ data: result[0] });
});

// POST /api/worlds/:id/duplicate — clone a world for remixing
worldRoutes.post("/:id/duplicate", async (c) => {
  const currentUser = c.get("user");
  const worldId = c.req.param("id");

  const existing = await db
    .select()
    .from(worlds)
    .where(eq(worlds.id, worldId));

  if (existing.length === 0) {
    return c.json({ error: "World not found" }, 404);
  }

  const source = existing[0]!;

  const result = await db
    .insert(worlds)
    .values({
      creatorId: currentUser.id,
      name: `${source.name} (Copy)`,
      description: source.description,
      schema: source.schema,
      thumbnailUrl: source.thumbnailUrl,
      isPublished: false,
    })
    .returning();

  return c.json({ data: result[0] }, 201);
});

// POST /api/worlds/:id/embeddings — generate/update lorebook embeddings
worldRoutes.post("/:id/embeddings", async (c) => {
  const currentUser = c.get("user");
  const worldId = c.req.param("id");

  // Load world
  const worldRows = await db
    .select()
    .from(worlds)
    .where(and(eq(worlds.id, worldId), eq(worlds.creatorId, currentUser.id)));

  if (worldRows.length === 0) {
    return c.json({ error: "World not found or not authorized" }, 404);
  }

  const rawWorldDef = worldRows[0]!.schema as unknown as WorldDefinition;
  const worldDef = migrateWorldDefinition(rawWorldDef);
  // Embed all non-greeting entries (greeting doesn't need semantic search)
  const entries = worldDef.entries.filter((e) => e.position !== "greeting");

  if (entries.length === 0) {
    return c.json({ data: { embedded: 0, skipped: 0 } });
  }

  // Find user's OpenAI API key (needed for embeddings)
  const keyRows = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.userId, currentUser.id), eq(apiKeys.provider, "openai")));

  if (keyRows.length === 0) {
    return c.json(
      { error: "OpenAI API key required for semantic search. Add one in Settings." },
      400
    );
  }

  const openaiKey = decryptApiKey(
    keyRows[0]!.encryptedKey,
    keyRows[0]!.keyIv,
    keyRows[0]!.keyTag
  );

  // Load existing embeddings
  const existing = await db
    .select()
    .from(lorebookEmbeddings)
    .where(eq(lorebookEmbeddings.worldId, worldId));

  const existingMap = new Map(existing.map((e) => [e.entryId, e]));

  // Find entries that need embedding (new or content changed)
  const needsEmbedding: Array<{ entry: typeof entries[0]; hash: string }> = [];

  for (const entry of entries) {
    if (!entry.enabled) continue;
    const hash = hashContent(entry.content);
    const existing = existingMap.get(entry.id);
    if (!existing || existing.contentHash !== hash) {
      needsEmbedding.push({ entry, hash });
    }
  }

  if (needsEmbedding.length === 0) {
    return c.json({ data: { embedded: 0, skipped: entries.length } });
  }

  try {
    // Generate embeddings in batch
    const texts = needsEmbedding.map(
      (n) => `${n.entry.name}: ${n.entry.content}`
    );
    const embeddings = await generateEmbeddings(texts, openaiKey);

    // Upsert embeddings
    for (let i = 0; i < needsEmbedding.length; i++) {
      const { entry, hash } = needsEmbedding[i]!;
      const embedding = embeddings[i]!;
      const existingRow = existingMap.get(entry.id);

      if (existingRow) {
        await db
          .update(lorebookEmbeddings)
          .set({ embedding, contentHash: hash, createdAt: new Date() })
          .where(eq(lorebookEmbeddings.id, existingRow.id));
      } else {
        await db.insert(lorebookEmbeddings).values({
          worldId,
          entryId: entry.id,
          embedding,
          contentHash: hash,
        });
      }
    }

    // Delete embeddings for entries that no longer exist
    const entryIds = new Set(entries.map((e) => e.id));
    for (const row of existing) {
      if (!entryIds.has(row.entryId)) {
        await db
          .delete(lorebookEmbeddings)
          .where(eq(lorebookEmbeddings.id, row.id));
      }
    }

    return c.json({
      data: {
        embedded: needsEmbedding.length,
        skipped: entries.length - needsEmbedding.length,
      },
    });
  } catch (err) {
    return c.json(
      {
        error: `Embedding generation failed: ${err instanceof Error ? err.message : "unknown error"}`,
      },
      500
    );
  }
});

// GET /api/worlds/:id/embeddings — check embedding status
worldRoutes.get("/:id/embeddings", async (c) => {
  const worldId = c.req.param("id");

  const rows = await db
    .select()
    .from(lorebookEmbeddings)
    .where(eq(lorebookEmbeddings.worldId, worldId));

  return c.json({ data: { count: rows.length, entryIds: rows.map((r) => r.entryId) } });
});

export { worldRoutes };
