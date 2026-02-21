import { cors } from "hono/cors";
import { env } from "../lib/env.js";

const isDev = process.env.NODE_ENV !== "production";

export const corsMiddleware = cors({
  origin: isDev
    ? (origin) => (origin.startsWith("http://localhost:") ? origin : null)
    : env.APP_URL,
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  credentials: true,
  maxAge: 86400,
});
