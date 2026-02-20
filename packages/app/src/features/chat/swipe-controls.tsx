import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useChatStore, type Message } from "@/stores/chat";

interface SwipeControlsProps {
  message: Message;
}

export function SwipeControls({ message }: SwipeControlsProps) {
  const { updateMessage, regenerateMessage, isStreaming } = useChatStore();
  const apiBase = import.meta.env.VITE_API_URL || "";

  const swipes = message.swipes ?? [];
  const currentIndex = message.activeSwipeIndex ?? 0;
  const totalSwipes = swipes.length;

  if (totalSwipes <= 1 && !message.model) return null;

  const handleSwipe = async (direction: "left" | "right") => {
    if (isStreaming) return;

    // If swiping right at the end, regenerate for a new swipe
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
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant="ghost"
        className="h-7 w-7 p-0"
        onClick={() => handleSwipe("left")}
        disabled={currentIndex <= 0 || isStreaming}
        title="Previous response"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <span className="min-w-[40px] text-center text-xs text-muted-foreground">
        {totalSwipes > 0 ? `${currentIndex + 1}/${totalSwipes}` : "1/1"}
      </span>

      <Button
        size="sm"
        variant="ghost"
        className="h-7 w-7 p-0"
        onClick={() => handleSwipe("right")}
        disabled={isStreaming}
        title={
          currentIndex >= totalSwipes - 1
            ? "Generate new response"
            : "Next response"
        }
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
