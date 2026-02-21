import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";

const ChatView = lazy(() =>
  import("@/features/chat/chat-view").then((m) => ({ default: m.ChatView }))
);

export const Route = createFileRoute("/app/chat/$sessionId")({
  component: () => {
    const { sessionId } = Route.useParams();
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <ChatView sessionId={sessionId} />
      </Suspense>
    );
  },
});

function LoadingSpinner() {
  return (
    <div className="flex h-full items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/40" />
    </div>
  );
}
