import { createFileRoute } from "@tanstack/react-router";
import { ConfigsPage } from "@/features/configs/configs-page";

export const Route = createFileRoute("/app/configs")({
  component: ConfigsPage,
});
