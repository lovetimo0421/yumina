import { Hono } from "hono";
import { eq, or, and } from "drizzle-orm";
import { db } from "../db/index.js";
import { worlds } from "../db/schema.js";
import { authMiddleware } from "../middleware/auth.js";
import { createWorldSchema, updateWorldSchema } from "@yumina/shared";
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

export { worldRoutes };
