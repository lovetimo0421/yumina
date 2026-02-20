import {
  pgTable,
  text,
  boolean,
  timestamp,
  integer,
  jsonb,
} from "drizzle-orm/pg-core";

// ─── Better Auth tables ─────────────────────────────────────────────

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─── Application tables ─────────────────────────────────────────────

export const worlds = pgTable("worlds", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  creatorId: text("creator_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description").default(""),
  schema: jsonb("schema").notNull().$type<Record<string, unknown>>().default({}),
  thumbnailUrl: text("thumbnail_url"),
  isPublished: boolean("is_published").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const playSessions = pgTable("play_sessions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  worldId: text("world_id")
    .notNull()
    .references(() => worlds.id, { onDelete: "cascade" }),
  state: jsonb("state").notNull().$type<Record<string, unknown>>().default({}),
  /** Structured summary of compacted (older) messages */
  summary: text("summary"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  sessionId: text("session_id")
    .notNull()
    .references(() => playSessions.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["user", "assistant", "system"] }).notNull(),
  content: text("content").notNull(),
  stateChanges: jsonb("state_changes").$type<Record<string, unknown>>(),
  swipes: jsonb("swipes")
    .$type<
      Array<{
        content: string;
        stateChanges?: Record<string, unknown>;
        createdAt: string;
        model?: string;
        tokenCount?: number;
      }>
    >()
    .default([]),
  activeSwipeIndex: integer("active_swipe_index").default(0),
  model: text("model"),
  tokenCount: integer("token_count"),
  generationTimeMs: integer("generation_time_ms"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const assets = pgTable("assets", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  worldId: text("world_id")
    .notNull()
    .references(() => worlds.id, { onDelete: "cascade" }),
  type: text("type", { enum: ["image", "audio", "font", "other"] }).notNull(),
  filename: text("filename").notNull(),
  url: text("url").notNull(),
  sizeBytes: integer("size_bytes"),
  mimeType: text("mime_type"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const lorebookEmbeddings = pgTable("lorebook_embeddings", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  worldId: text("world_id")
    .notNull()
    .references(() => worlds.id, { onDelete: "cascade" }),
  entryId: text("entry_id").notNull(),
  embedding: jsonb("embedding").notNull().$type<number[]>(),
  contentHash: text("content_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const worldMemories = pgTable("world_memories", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  worldId: text("world_id")
    .notNull()
    .references(() => worlds.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  category: text("category", {
    enum: ["event", "relationship", "fact", "decision"],
  }).notNull(),
  importance: integer("importance").notNull().default(5),
  sessionId: text("session_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const apiKeys = pgTable("api_keys", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  provider: text("provider").notNull().default("openrouter"),
  encryptedKey: text("encrypted_key").notNull(),
  keyIv: text("key_iv").notNull(),
  keyTag: text("key_tag").notNull(),
  label: text("label").notNull().default("Default"),
  createdAt: timestamp("created_at").defaultNow(),
});
