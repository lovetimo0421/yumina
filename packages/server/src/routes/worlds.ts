import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { worlds } from "../db/schema.js";
import { authMiddleware } from "../middleware/auth.js";
import { createWorldSchema } from "@yumina/shared";
import type { AppEnv } from "../lib/types.js";

const worldRoutes = new Hono<AppEnv>();

worldRoutes.use("/*", authMiddleware);

// GET /api/worlds
worldRoutes.get("/", async (c) => {
  const currentUser = c.get("user");
  const result = await db
    .select()
    .from(worlds)
    .where(eq(worlds.creatorId, currentUser.id));

  return c.json({ data: result });
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

export { worldRoutes };
