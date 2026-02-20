import { createFileRoute } from "@tanstack/react-router";
import { WorldBrowser } from "@/features/worlds/world-browser";

export const Route = createFileRoute("/app/worlds")({
  component: WorldBrowser,
});
