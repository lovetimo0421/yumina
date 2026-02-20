import { cors } from "hono/cors";
import { env } from "../lib/env.js";

export const corsMiddleware = cors({
  origin: env.APP_URL,
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  credentials: true,
  maxAge: 86400,
});
