import { Hono } from "hono";
import { eq, and } from "drizzle-orm";
import { db } from "../db/index.js";
import { apiKeys } from "../db/schema.js";
import { authMiddleware } from "../middleware/auth.js";
import { encryptApiKey, decryptApiKey } from "../lib/crypto.js";
import { createProvider } from "../lib/llm/provider-factory.js";
import type { ProviderName } from "../lib/llm/provider-factory.js";
import type { AppEnv } from "../lib/types.js";

const apiKeyRoutes = new Hono<AppEnv>();

apiKeyRoutes.use("/*", authMiddleware);

// POST /api/keys — store a new API key
apiKeyRoutes.post("/", async (c) => {
  const currentUser = c.get("user");
  const body = await c.req.json<{
    key: string;
    provider?: string;
    label?: string;
  }>();

  if (!body.key || typeof body.key !== "string") {
    return c.json({ error: "API key is required" }, 400);
  }

  const { encrypted, iv, tag } = encryptApiKey(body.key);

  const result = await db
    .insert(apiKeys)
    .values({
      userId: currentUser.id,
      provider: body.provider ?? "openrouter",
      encryptedKey: encrypted,
      keyIv: iv,
      keyTag: tag,
      label: body.label ?? "Default",
    })
    .returning({
      id: apiKeys.id,
      provider: apiKeys.provider,
      label: apiKeys.label,
      createdAt: apiKeys.createdAt,
    });

  return c.json({ data: result[0] }, 201);
});

// GET /api/keys — list keys (metadata only)
apiKeyRoutes.get("/", async (c) => {
  const currentUser = c.get("user");
  const result = await db
    .select({
      id: apiKeys.id,
      provider: apiKeys.provider,
      label: apiKeys.label,
      createdAt: apiKeys.createdAt,
    })
    .from(apiKeys)
    .where(eq(apiKeys.userId, currentUser.id));

  return c.json({ data: result });
});

// DELETE /api/keys/:id — remove a key
apiKeyRoutes.delete("/:id", async (c) => {
  const currentUser = c.get("user");
  const keyId = c.req.param("id");

  const result = await db
    .delete(apiKeys)
    .where(and(eq(apiKeys.id, keyId), eq(apiKeys.userId, currentUser.id)))
    .returning({ id: apiKeys.id });

  if (result.length === 0) {
    return c.json({ error: "Key not found" }, 404);
  }

  return c.json({ data: { deleted: true } });
});

// POST /api/keys/:id/verify — test that a key works
apiKeyRoutes.post("/:id/verify", async (c) => {
  const currentUser = c.get("user");
  const keyId = c.req.param("id");

  const rows = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.id, keyId), eq(apiKeys.userId, currentUser.id)));

  if (rows.length === 0) {
    return c.json({ error: "Key not found" }, 404);
  }

  const row = rows[0]!;
  const decrypted = decryptApiKey(row.encryptedKey, row.keyIv, row.keyTag);

  try {
    const provider = createProvider(row.provider as ProviderName, decrypted);
    if (provider.verify) {
      const valid = await provider.verify();
      return c.json({ data: { valid } });
    }
    return c.json({ data: { valid: false, reason: "Provider does not support verification" } });
  } catch {
    return c.json({ data: { valid: false, reason: "Verification failed" } });
  }
});

export { apiKeyRoutes };
