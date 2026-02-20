import { z } from "zod";

export const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  image: z.string().url().nullable().optional(),
});

export type UpdateProfileSchema = z.infer<typeof updateProfileSchema>;
