import { Hono } from "hono";
import { auth } from "../lib/auth.js";

const authRoutes = new Hono();

// Better Auth handles all auth routes under /api/auth/*
authRoutes.all("/*", (c) => {
  return auth.handler(c.req.raw);
});

export { authRoutes };
