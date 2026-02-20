import { useState } from "react";
import { Pencil, RefreshCw, Copy, Trash2, Check, X } from "lucide-react";
import { useChatStore, type Message } from "@/stores/chat";

interface MessageActionsProps {
  message: Message;
}

const apiBase = import.meta.env.VITE_API_URL || "";

export function MessageActions({ message }: MessageActionsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { updateMessage, removeMessage, regenerateMessage } = useChatStore();

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
      <div className="flex w-full flex-col gap-2 pt-1">
        <textarea
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          className="min-h-[60px] w-full resize-y rounded-lg border border-border bg-background/50 p-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <div className="flex gap-1.5">
          <button
            onClick={handleEdit}
            className="flex h-7 items-center gap-1 rounded-md bg-primary/20 px-2.5 text-xs font-medium text-primary transition-colors hover:bg-primary/30"
          >
            <Check className="h-3 w-3" /> Save
          </button>
          <button
            onClick={() => {
              setIsEditing(false);
              setEditContent(message.content);
            }}
            className="flex h-7 items-center gap-1 rounded-md px-2.5 text-xs text-muted-foreground transition-colors hover:bg-white/8 hover:text-foreground"
          >
            <X className="h-3 w-3" /> Cancel
          </button>
        </div>
      </div>
    );
  }

  if (confirmDelete) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] text-muted-foreground">Delete?</span>
        <button
          onClick={handleDelete}
          className="h-6 rounded-md bg-destructive/20 px-2 text-[11px] font-medium text-destructive transition-colors hover:bg-destructive/30"
        >
          Yes
        </button>
        <button
          onClick={() => setConfirmDelete(false)}
          className="h-6 rounded-md px-2 text-[11px] text-muted-foreground transition-colors hover:bg-white/8"
        >
          No
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-0.5">
      <ActionButton onClick={handleCopy} title="Copy">
        {copied ? (
          <Check className="h-3 w-3 text-green-400" />
        ) : (
          <Copy className="h-3 w-3" />
        )}
      </ActionButton>

      <ActionButton onClick={() => setIsEditing(true)} title="Edit">
        <Pencil className="h-3 w-3" />
      </ActionButton>

      {message.role === "assistant" && (
        <ActionButton onClick={handleRegenerate} title="Regenerate">
          <RefreshCw className="h-3 w-3" />
        </ActionButton>
      )}

      <ActionButton
        onClick={() => setConfirmDelete(true)}
        title="Delete"
        className="hover:text-destructive"
      >
        <Trash2 className="h-3 w-3" />
      </ActionButton>
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  title,
  className,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground/50 transition-all duration-150 hover:bg-white/8 hover:text-foreground ${className ?? ""}`}
    >
      {children}
    </button>
  );
}
