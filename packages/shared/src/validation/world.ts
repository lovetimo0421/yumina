import { z } from "zod";

export const createWorldSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional().default(""),
  schema: z.record(z.unknown()).optional().default({}),
  tags: z.array(z.string().max(50)).max(10).optional(),
});

export const updateWorldSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  schema: z.record(z.unknown()).optional(),
  thumbnailUrl: z.string().url().nullable().optional(),
  isPublished: z.boolean().optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
});

export type CreateWorldSchema = z.infer<typeof createWorldSchema>;
export type UpdateWorldSchema = z.infer<typeof updateWorldSchema>;
