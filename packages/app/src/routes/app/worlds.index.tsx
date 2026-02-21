import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/app/worlds/")({
  beforeLoad: () => {
    throw redirect({ to: "/app/portals" });
  },
});
