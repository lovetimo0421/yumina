import { Hono } from "hono";
import { eq, or, and, desc, ilike, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { worlds, user, playSessions, messages } from "../db/schema.js";
import { GameStateManager, PromptBuilder, migrateWorldDefinition } from "@yumina/engine";
import type { WorldDefinition } from "@yumina/engine";
import { isS3Configured, generateDownloadUrl } from "../lib/s3.js";
import { authMiddleware } from "../middleware/auth.js";
import { createWorldSchema, updateWorldSchema } from "@yumina/shared";
import type { AppEnv } from "../lib/types.js";

const worldRoutes = new Hono<AppEnv>();

worldRoutes.use("/*", authMiddleware);

/** Resolve thumbnailUrl: if it's an S3 key, generate a presigned URL */
async function resolveThumbnail(url: string | null): Promise<string | null> {
  if (!url || url.startsWith("http") || !isS3Configured()) return url;
  try {
    return await generateDownloadUrl(url);
  } catch {
    return url;
  }
}

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

// GET /api/worlds/hub — browse published worlds
worldRoutes.get("/hub", async (c) => {
  const q = c.req.query("q")?.trim();
  const tag = c.req.query("tag");
  const sort = c.req.query("sort") === "popular" ? "popular" : "newest";

  const conditions = [eq(worlds.isPublished, true)];

  if (q) {
    conditions.push(
      or(ilike(worlds.name, `%${q}%`), ilike(worlds.description, `%${q}%`))!
    );
  }

  if (tag) {
    conditions.push(sql`${worlds.tags} @> ${JSON.stringify([tag])}::jsonb`);
  }

  const orderBy =
    sort === "popular"
      ? desc(worlds.downloadCount)
      : desc(worlds.createdAt);

  const result = await db
    .select({
      id: worlds.id,
      creatorId: worlds.creatorId,
      name: worlds.name,
      description: worlds.description,
      schema: worlds.schema,
      thumbnailUrl: worlds.thumbnailUrl,
      isPublished: worlds.isPublished,
      downloadCount: worlds.downloadCount,
      tags: worlds.tags,
      createdAt: worlds.createdAt,
      updatedAt: worlds.updatedAt,
      creatorName: user.name,
      creatorImage: user.image,
    })
    .from(worlds)
    .leftJoin(user, eq(worlds.creatorId, user.id))
    .where(and(...conditions))
    .orderBy(orderBy)
    .limit(50);

  // Resolve S3 thumbnail keys to presigned URLs
  const resolved = await Promise.all(
    result.map(async (w) => ({
      ...w,
      thumbnailUrl: await resolveThumbnail(w.thumbnailUrl),
    }))
  );

  return c.json({ data: resolved });
});

// GET /api/worlds/:id — get a single world
worldRoutes.get("/:id", async (c) => {
  const worldId = c.req.param("id");
  const result = await db.select().from(worlds).where(eq(worlds.id, worldId));

  if (result.length === 0) {
    return c.json({ error: "World not found" }, 404);
  }

  const world = result[0]!;
  world.thumbnailUrl = await resolveThumbnail(world.thumbnailUrl);

  return c.json({ data: world });
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

  // Find next available conflict number: "Name (1)", "Name (2)", etc.
  const baseName = source.name.replace(/\s*\(\d+\)$/, "");
  const siblings = await db
    .select({ name: worlds.name })
    .from(worlds)
    .where(and(eq(worlds.creatorId, currentUser.id), ilike(worlds.name, `${baseName}%`)));
  const usedNumbers = siblings
    .map((s) => {
      const match = (s.name ?? "").match(/\((\d+)\)$/);
      return match?.[1] ? parseInt(match[1]) : 0;
    })
    .filter((n) => n > 0);
  const nextNum = usedNumbers.length > 0 ? Math.max(...usedNumbers) + 1 : 1;

  const [result] = await db
    .insert(worlds)
    .values({
      creatorId: currentUser.id,
      name: `${baseName} (${nextNum})`,
      description: source.description,
      schema: source.schema,
      thumbnailUrl: source.thumbnailUrl,
      tags: source.tags,
      isPublished: false,
      sourceWorldId: worldId,
    })
    .returning();

  // Increment download count on source world
  await db
    .update(worlds)
    .set({ downloadCount: sql`${worlds.downloadCount} + 1` })
    .where(eq(worlds.id, worldId));

  return c.json({ data: result }, 201);
});

// GET /api/worlds/:id/my-copy — check if user already has a copy of this hub world
worldRoutes.get("/:id/my-copy", async (c) => {
  const currentUser = c.get("user");
  const worldId = c.req.param("id");

  const copies = await db
    .select({ id: worlds.id })
    .from(worlds)
    .where(and(eq(worlds.sourceWorldId, worldId), eq(worlds.creatorId, currentUser.id)))
    .limit(1);

  if (copies.length > 0) {
    return c.json({ data: { exists: true, worldId: copies[0]!.id } });
  }

  // Also check if the user IS the creator of this world
  const owned = await db
    .select({ id: worlds.id })
    .from(worlds)
    .where(and(eq(worlds.id, worldId), eq(worlds.creatorId, currentUser.id)))
    .limit(1);

  if (owned.length > 0) {
    return c.json({ data: { exists: true, worldId: owned[0]!.id } });
  }

  return c.json({ data: { exists: false } });
});

// POST /api/worlds/:id/play-from-hub — add to library + create session atomically
worldRoutes.post("/:id/play-from-hub", async (c) => {
  const currentUser = c.get("user");
  const worldId = c.req.param("id");

  // Check if user already has a copy
  const existingCopy = await db
    .select()
    .from(worlds)
    .where(and(eq(worlds.sourceWorldId, worldId), eq(worlds.creatorId, currentUser.id)))
    .limit(1);

  let targetWorldId: string;

  if (existingCopy.length > 0) {
    targetWorldId = existingCopy[0]!.id;
  } else {
    // Check if user IS the creator
    const owned = await db
      .select()
      .from(worlds)
      .where(and(eq(worlds.id, worldId), eq(worlds.creatorId, currentUser.id)))
      .limit(1);

    if (owned.length > 0) {
      targetWorldId = owned[0]!.id;
    } else {
      // Duplicate the world (keep original name — no "(1)" suffix for hub imports)
      const source = await db.select().from(worlds).where(eq(worlds.id, worldId));
      if (source.length === 0) return c.json({ error: "World not found" }, 404);

      const s = source[0]!;
      const [newWorld] = await db
        .insert(worlds)
        .values({
          creatorId: currentUser.id,
          name: s.name,
          description: s.description,
          schema: s.schema,
          thumbnailUrl: s.thumbnailUrl,
          tags: s.tags,
          isPublished: false,
          sourceWorldId: worldId,
        })
        .returning();

      // Increment download count on source
      await db
        .update(worlds)
        .set({ downloadCount: sql`${worlds.downloadCount} + 1` })
        .where(eq(worlds.id, worldId));

      targetWorldId = newWorld!.id;
    }
  }

  // Create session on the target world
  const worldRows = await db.select().from(worlds).where(eq(worlds.id, targetWorldId));
  if (worldRows.length === 0) return c.json({ error: "World not found" }, 404);

  const rawWorldDef = worldRows[0]!.schema as unknown as WorldDefinition;
  const worldDef = migrateWorldDefinition(rawWorldDef);
  const stateManager = new GameStateManager(worldDef);
  const initialState = stateManager.getSnapshot();

  const [session] = await db
    .insert(playSessions)
    .values({
      userId: currentUser.id,
      worldId: targetWorldId,
      state: initialState as unknown as Record<string, unknown>,
    })
    .returning();

  // Insert greeting if applicable
  const promptBuilder = new PromptBuilder();
  const greeting = promptBuilder.buildGreeting(worldDef, initialState);
  if (greeting) {
    await db.insert(messages).values({
      sessionId: session!.id,
      role: "assistant",
      content: greeting,
    });
  }

  return c.json({ data: { worldId: targetWorldId, session: session! } }, 201);
});

export { worldRoutes };
