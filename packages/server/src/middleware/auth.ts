import { createMiddleware } from "hono/factory";
import type { AppEnv } from "../lib/types.js";
import { auth } from "../lib/auth.js";

export const authMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  c.set("user", session.user as AppEnv["Variables"]["user"]);
  c.set("session", session.session as AppEnv["Variables"]["session"]);
  await next();
});
