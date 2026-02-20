import { useState } from "react";
import {
  Pencil,
  RefreshCw,
  Copy,
  Trash2,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useChatStore, type Message } from "@/stores/chat";

interface MessageActionsProps {
  message: Message;
}

export function MessageActions({ message }: MessageActionsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { updateMessage, removeMessage, regenerateMessage } = useChatStore();
  const apiBase = import.meta.env.VITE_API_URL || "";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleEdit = async () => {
    try {
      const res = await fetch(`${apiBase}/api/messages/${message.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content: editContent }),
      });
      if (res.ok) {
        updateMessage(message.id, { content: editContent });
        setIsEditing(false);
      }
    } catch {
      // Silently fail
    }
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`${apiBase}/api/messages/${message.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        removeMessage(message.id);
      }
    } catch {
      // Silently fail
    }
    setConfirmDelete(false);
  };

  const handleRegenerate = () => {
    if (message.role === "assistant") {
      regenerateMessage(message.id);
    }
  };

  if (isEditing) {
    return (
      <div className="flex flex-col gap-2">
        <textarea
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          className="min-h-[80px] w-full resize-y rounded-md border border-border bg-background p-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <div className="flex gap-2">
          <Button size="sm" onClick={handleEdit}>
            <Check className="mr-1 h-3 w-3" /> Save
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setIsEditing(false);
              setEditContent(message.content);
            }}
          >
            <X className="mr-1 h-3 w-3" /> Cancel
          </Button>
        </div>
      </div>
    );
  }

  if (confirmDelete) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Delete?</span>
        <Button size="sm" variant="destructive" onClick={handleDelete}>
          Yes
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setConfirmDelete(false)}
        >
          No
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        size="sm"
        variant="ghost"
        className="h-7 w-7 p-0"
        onClick={() => setIsEditing(true)}
        title="Edit"
      >
        <Pencil className="h-3.5 w-3.5" />
      </Button>

      {message.role === "assistant" && (
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0"
          onClick={handleRegenerate}
          title="Regenerate"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      )}

      <Button
        size="sm"
        variant="ghost"
        className="h-7 w-7 p-0"
        onClick={handleCopy}
        title="Copy"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-green-500" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </Button>

      <Button
        size="sm"
        variant="ghost"
        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
        onClick={() => setConfirmDelete(true)}
        title="Delete"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
