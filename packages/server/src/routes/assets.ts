import { Hono } from "hono";
import { eq, and, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { assets, worlds } from "../db/schema.js";
import { authMiddleware } from "../middleware/auth.js";
import {
  isS3Configured,
  generateUploadUrl,
  generateDownloadUrl,
  deleteObject,
} from "../lib/s3.js";
import type { AppEnv } from "../lib/types.js";

const assetRoutes = new Hono<AppEnv>();

assetRoutes.use("/*", authMiddleware);

// ─── Constants ──────────────────────────────────────────────────────

const ALLOWED_MIME_TYPES: Record<string, string[]> = {
  image: ["image/jpeg", "image/png", "image/gif", "image/webp"],
  audio: [
    "audio/mpeg",
    "audio/wav",
    "audio/ogg",
    "audio/aac",
    "audio/mp4",
    "audio/x-wav",
  ],
  font: [
    "font/woff",
    "font/woff2",
    "font/ttf",
    "font/otf",
    "application/font-woff",
    "application/font-woff2",
  ],
  other: [],
};

const MAX_FILE_SIZE: Record<string, number> = {
  image: 5 * 1024 * 1024,
  audio: 20 * 1024 * 1024,
  font: 2 * 1024 * 1024,
  other: 5 * 1024 * 1024,
};

const MAX_WORLD_STORAGE = 100 * 1024 * 1024; // 100MB

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100);
}

// ─── Helper: verify world ownership ─────────────────────────────────

async function verifyWorldOwnership(worldId: string, userId: string) {
  const rows = await db
    .select({ id: worlds.id })
    .from(worlds)
    .where(and(eq(worlds.id, worldId), eq(worlds.creatorId, userId)));
  return rows.length > 0;
}

// ─── Routes ─────────────────────────────────────────────────────────

// POST /api/worlds/:worldId/assets/upload-url — get presigned upload URL
assetRoutes.post("/worlds/:worldId/assets/upload-url", async (c) => {
  if (!isS3Configured()) {
    return c.json({ error: "Asset storage not configured" }, 503);
  }

  const currentUser = c.get("user");
  const worldId = c.req.param("worldId");
  const body = await c.req.json<{
    filename: string;
    contentType: string;
    type: string;
  }>();

  if (!body.filename || !body.contentType || !body.type) {
    return c.json({ error: "filename, contentType, and type are required" }, 400);
  }

  const assetType = body.type as keyof typeof ALLOWED_MIME_TYPES;
  if (!["image", "audio", "font", "other"].includes(assetType)) {
    return c.json({ error: "Invalid asset type" }, 400);
  }

  // Validate MIME type
  const allowed = ALLOWED_MIME_TYPES[assetType];
  if (allowed && allowed.length > 0 && !allowed.includes(body.contentType)) {
    return c.json({ error: `Invalid content type for ${assetType}` }, 400);
  }

  if (!(await verifyWorldOwnership(worldId, currentUser.id))) {
    return c.json({ error: "World not found or not authorized" }, 404);
  }

  // Check total world storage
  const storageResult = await db
    .select({ total: sql<number>`COALESCE(SUM(${assets.sizeBytes}), 0)` })
    .from(assets)
    .where(eq(assets.worldId, worldId));

  const totalUsed = Number(storageResult[0]?.total ?? 0);
  if (totalUsed >= MAX_WORLD_STORAGE) {
    return c.json({ error: "World storage limit reached (100MB)" }, 400);
  }

  // Generate S3 key
  const safeName = sanitizeFilename(body.filename);
  const key = `worlds/${worldId}/${assetType}/${crypto.randomUUID()}-${safeName}`;

  const uploadUrl = await generateUploadUrl(key, body.contentType);

  return c.json({
    data: {
      uploadUrl,
      key,
      maxSize: MAX_FILE_SIZE[assetType] ?? MAX_FILE_SIZE.other,
    },
  });
});

// POST /api/worlds/:worldId/assets — register asset after upload
assetRoutes.post("/worlds/:worldId/assets", async (c) => {
  const currentUser = c.get("user");
  const worldId = c.req.param("worldId");
  const body = await c.req.json<{
    key: string;
    filename: string;
    type: string;
    mimeType: string;
    sizeBytes: number;
  }>();

  if (!body.key || !body.filename || !body.type || !body.mimeType) {
    return c.json({ error: "key, filename, type, and mimeType are required" }, 400);
  }

  // Validate key belongs to this world
  if (!body.key.startsWith(`worlds/${worldId}/`)) {
    return c.json({ error: "Invalid asset key" }, 400);
  }

  if (!(await verifyWorldOwnership(worldId, currentUser.id))) {
    return c.json({ error: "World not found or not authorized" }, 404);
  }

  // Validate file size
  const maxSize = MAX_FILE_SIZE[body.type as keyof typeof MAX_FILE_SIZE] ?? MAX_FILE_SIZE.other;
  if (body.sizeBytes > maxSize!) {
    return c.json({ error: `File too large (max ${Math.round(maxSize! / 1024 / 1024)}MB)` }, 400);
  }

  const [result] = await db
    .insert(assets)
    .values({
      worldId,
      type: body.type as "image" | "audio" | "font" | "other",
      filename: body.filename,
      url: body.key, // Store S3 key, not presigned URL
      sizeBytes: body.sizeBytes,
      mimeType: body.mimeType,
    })
    .returning();

  // Return with presigned download URL
  let downloadUrl = "";
  try {
    downloadUrl = await generateDownloadUrl(body.key);
  } catch { /* leave empty */ }

  return c.json(
    {
      data: {
        ...result!,
        url: downloadUrl,
      },
    },
    201
  );
});

// GET /api/worlds/:worldId/assets — list assets for a world
assetRoutes.get("/worlds/:worldId/assets", async (c) => {
  const currentUser = c.get("user");
  const worldId = c.req.param("worldId");
  const typeFilter = c.req.query("type");

  if (!(await verifyWorldOwnership(worldId, currentUser.id))) {
    return c.json({ error: "World not found or not authorized" }, 404);
  }

  const conditions = [eq(assets.worldId, worldId)];
  if (typeFilter && ["image", "audio", "font", "other"].includes(typeFilter)) {
    conditions.push(eq(assets.type, typeFilter as "image" | "audio" | "font" | "other"));
  }

  const rows = await db
    .select()
    .from(assets)
    .where(and(...conditions))
    .orderBy(assets.createdAt);

  // Generate presigned URLs for each asset
  const withUrls = await Promise.all(
    rows.map(async (row) => {
      let url = row.url;
      if (isS3Configured() && !row.url.startsWith("http")) {
        try {
          url = await generateDownloadUrl(row.url);
        } catch { /* use raw key as fallback */ }
      }
      return { ...row, url };
    })
  );

  // Calculate total storage used
  const totalBytes = rows.reduce((sum, r) => sum + (r.sizeBytes ?? 0), 0);

  return c.json({ data: withUrls, storage: { used: totalBytes, limit: MAX_WORLD_STORAGE } });
});

// GET /api/assets/:id/url — get presigned URL for a single asset
assetRoutes.get("/assets/:id/url", async (c) => {
  if (!isS3Configured()) {
    return c.json({ error: "Asset storage not configured" }, 503);
  }

  const assetId = c.req.param("id");

  const rows = await db
    .select()
    .from(assets)
    .where(eq(assets.id, assetId));

  if (rows.length === 0) {
    return c.json({ error: "Asset not found" }, 404);
  }

  const asset = rows[0]!;
  const url = await generateDownloadUrl(asset.url);

  return c.json({ data: { url } });
});

// DELETE /api/worlds/:worldId/assets/:id — delete asset
assetRoutes.delete("/worlds/:worldId/assets/:id", async (c) => {
  const currentUser = c.get("user");
  const worldId = c.req.param("worldId");
  const assetId = c.req.param("id");

  if (!(await verifyWorldOwnership(worldId, currentUser.id))) {
    return c.json({ error: "World not found or not authorized" }, 404);
  }

  const rows = await db
    .select()
    .from(assets)
    .where(and(eq(assets.id, assetId), eq(assets.worldId, worldId)));

  if (rows.length === 0) {
    return c.json({ error: "Asset not found" }, 404);
  }

  // Delete from S3
  if (isS3Configured()) {
    try {
      await deleteObject(rows[0]!.url);
    } catch { /* S3 delete failed — still remove DB record */ }
  }

  await db.delete(assets).where(eq(assets.id, assetId));

  return c.json({ data: { deleted: true } });
});

// POST /api/worlds/:worldId/thumbnail — get thumbnail upload URL
assetRoutes.post("/worlds/:worldId/thumbnail", async (c) => {
  if (!isS3Configured()) {
    return c.json({ error: "Asset storage not configured" }, 503);
  }

  const currentUser = c.get("user");
  const worldId = c.req.param("worldId");
  const body = await c.req.json<{ filename: string; contentType: string }>();

  if (!body.filename || !body.contentType) {
    return c.json({ error: "filename and contentType are required" }, 400);
  }

  if (!ALLOWED_MIME_TYPES.image!.includes(body.contentType)) {
    return c.json({ error: "Only image files allowed for thumbnails" }, 400);
  }

  if (!(await verifyWorldOwnership(worldId, currentUser.id))) {
    return c.json({ error: "World not found or not authorized" }, 404);
  }

  const ext = body.filename.split(".").pop() ?? "png";
  const key = `worlds/${worldId}/thumbnail/${crypto.randomUUID()}.${ext}`;
  const uploadUrl = await generateUploadUrl(key, body.contentType);

  return c.json({ data: { uploadUrl, key } });
});

// POST /api/worlds/:worldId/thumbnail/confirm — confirm thumbnail upload
assetRoutes.post("/worlds/:worldId/thumbnail/confirm", async (c) => {
  const currentUser = c.get("user");
  const worldId = c.req.param("worldId");
  const body = await c.req.json<{ key: string }>();

  if (!body.key || !body.key.startsWith(`worlds/${worldId}/thumbnail/`)) {
    return c.json({ error: "Invalid thumbnail key" }, 400);
  }

  const result = await db
    .update(worlds)
    .set({ thumbnailUrl: body.key, updatedAt: new Date() })
    .where(and(eq(worlds.id, worldId), eq(worlds.creatorId, currentUser.id)))
    .returning();

  if (result.length === 0) {
    return c.json({ error: "World not found or not authorized" }, 404);
  }

  // Return the presigned URL for immediate display
  let url = body.key;
  if (isS3Configured()) {
    try {
      url = await generateDownloadUrl(body.key);
    } catch { /* use key */ }
  }

  return c.json({ data: { thumbnailUrl: url } });
});

export { assetRoutes };
