import { Hono } from "hono";

const health = new Hono();

health.get("/", (c) => {
  return c.json({
    status: "ok" as const,
    timestamp: new Date().toISOString(),
  });
});

export { health };
