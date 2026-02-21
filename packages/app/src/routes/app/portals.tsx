import { createFileRoute } from "@tanstack/react-router";
import { PortalsPage } from "@/features/portals/portals-page";

export const Route = createFileRoute("/app/portals")({
  component: PortalsPage,
});
