import { createFileRoute } from "@tanstack/react-router";
import { ChatView } from "@/features/chat/chat-view";

export const Route = createFileRoute("/app/chat/$sessionId")({
  component: () => {
    const { sessionId } = Route.useParams();
    return <ChatView sessionId={sessionId} />;
  },
});
