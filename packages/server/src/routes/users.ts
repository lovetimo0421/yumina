import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { user } from "../db/schema.js";
import { authMiddleware } from "../middleware/auth.js";
import { updateProfileSchema } from "@yumina/shared";
import type { AppEnv } from "../lib/types.js";

const users = new Hono<AppEnv>();

users.use("/*", authMiddleware);

// GET /api/users/me
users.get("/me", async (c) => {
  const currentUser = c.get("user");
  const result = await db
    .select()
    .from(user)
    .where(eq(user.id, currentUser.id))
    .limit(1);

  if (result.length === 0) {
    return c.json({ error: "User not found" }, 404);
  }

  return c.json({ data: result[0] });
});

// PATCH /api/users/me
users.patch("/me", async (c) => {
  const currentUser = c.get("user");
  const body = await c.req.json();
  const parsed = updateProfileSchema.safeParse(body);

  if (!parsed.success) {
    return c.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      400
    );
  }

  const result = await db
    .update(user)
    .set({
      ...parsed.data,
      updatedAt: new Date(),
    })
    .where(eq(user.id, currentUser.id))
    .returning();

  if (result.length === 0) {
    return c.json({ error: "User not found" }, 404);
  }

  return c.json({ data: result[0] });
});

export { users };
