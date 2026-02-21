import { createFileRoute } from "@tanstack/react-router";
import { WorldInfoPage } from "@/features/world-info/world-info-page";

export const Route = createFileRoute("/app/world-info")({
  component: WorldInfoPage,
});
