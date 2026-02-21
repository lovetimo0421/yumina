import { z } from "zod";
import { config } from "dotenv";

config({ path: "../../.env" });

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(1),
  BETTER_AUTH_URL: z.string().url().default("http://localhost:3000"),
  GOOGLE_CLIENT_ID: z.string().default(""),
  GOOGLE_CLIENT_SECRET: z.string().default(""),
  GITHUB_CLIENT_ID: z.string().default(""),
  GITHUB_CLIENT_SECRET: z.string().default(""),
  APP_URL: z.string().url().default("http://localhost:5173"),
  PORT: z.coerce.number().default(3000),
  SENTRY_DSN: z.string().default(""),
  // S3-compatible storage (Railway Storage Buckets)
  AWS_S3_BUCKET_NAME: z.string().default(""),
  AWS_ACCESS_KEY_ID: z.string().default(""),
  AWS_SECRET_ACCESS_KEY: z.string().default(""),
  AWS_ENDPOINT_URL: z.string().default("https://t3.storageapi.dev"),
  AWS_DEFAULT_REGION: z.string().default("sjc"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
