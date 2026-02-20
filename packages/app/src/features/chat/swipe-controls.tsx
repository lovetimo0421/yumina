import { ChevronLeft, ChevronRight } from "lucide-react";
import { useChatStore, type Message } from "@/stores/chat";

interface SwipeControlsProps {
  message: Message;
}

const apiBase = import.meta.env.VITE_API_URL || "";

export function SwipeControls({ message }: SwipeControlsProps) {
  const { updateMessage, regenerateMessage, isStreaming } = useChatStore();

  const swipes = message.swipes ?? [];
  const currentIndex = message.activeSwipeIndex ?? 0;
  const totalSwipes = swipes.length;

  if (totalSwipes <= 1 && !message.model) return null;

  const handleSwipe = async (direction: "left" | "right") => {
    if (isStreaming) return;

    if (direction === "right" && currentIndex >= totalSwipes - 1) {
      regenerateMessage(message.id);
      return;
    }

    try {
      const res = await fetch(
        `${apiBase}/api/messages/${message.id}/swipe`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ direction }),
        }
      );

      if (res.ok) {
        const { data } = await res.json();
        updateMessage(message.id, {
          content: data.content,
          activeSwipeIndex: data.activeSwipeIndex,
          stateChanges: data.stateChanges,
        });
      }
    } catch {
      // Silently fail
    }
  };

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => handleSwipe("left")}
        disabled={currentIndex <= 0 || isStreaming}
        className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground/50 transition-colors hover:bg-white/8 hover:text-foreground disabled:opacity-30 disabled:cursor-default"
        title="Previous response"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
      </button>

      <span className="min-w-[32px] text-center text-[11px] text-muted-foreground/50">
        {totalSwipes > 0 ? `${currentIndex + 1}/${totalSwipes}` : "1/1"}
      </span>

      <button
        onClick={() => handleSwipe("right")}
        disabled={isStreaming}
        className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground/50 transition-colors hover:bg-white/8 hover:text-foreground disabled:opacity-30 disabled:cursor-default"
        title={
          currentIndex >= totalSwipes - 1
            ? "Generate new response"
            : "Next response"
        }
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
