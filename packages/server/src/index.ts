import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { env } from "./lib/env.js";
import { corsMiddleware } from "./middleware/cors.js";
import { health } from "./routes/health.js";
import { authRoutes } from "./routes/auth.js";
import { users } from "./routes/users.js";
import { worldRoutes } from "./routes/worlds.js";
import { apiKeyRoutes } from "./routes/api-keys.js";
import { sessionRoutes } from "./routes/sessions.js";
import { messageRoutes } from "./routes/messages.js";
import { studioRoutes } from "./routes/studio.js";

const app = new Hono();

// Global middleware
app.use("*", corsMiddleware);

// Routes
app.route("/health", health);
app.route("/api/auth", authRoutes);
app.route("/api/users", users);
app.route("/api/worlds", worldRoutes);
app.route("/api/keys", apiKeyRoutes);
app.route("/api/sessions", sessionRoutes);
app.route("/api", messageRoutes);
app.route("/api/studio", studioRoutes);

// Root
app.get("/", (c) => {
  return c.json({ name: "Yumina API", version: "0.0.1" });
});

// Start server
serve(
  {
    fetch: app.fetch,
    port: env.PORT,
  },
  (info) => {
    console.log(`Yumina server running on http://localhost:${info.port}`);
  }
);

// Export app type for Hono RPC client
export type AppType = typeof app;
