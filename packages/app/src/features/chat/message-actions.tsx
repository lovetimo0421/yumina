import { useState } from "react";
import { Pencil, RefreshCw, Copy, Trash2, Check, X, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
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
  const [confirmRevert, setConfirmRevert] = useState(false);

  const { updateMessage, removeMessage, regenerateMessage, revertToMessage, messages } = useChatStore();

  // Don't show revert if this is the last message (nothing to delete after it)
  const isLastMessage = messages[messages.length - 1]?.id === message.id;

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
      } else {
        toast.error("Failed to edit message");
      }
    } catch {
      toast.error("Failed to edit message");
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
      } else {
        toast.error("Failed to delete message");
      }
    } catch {
      toast.error("Failed to delete message");
    }
    setConfirmDelete(false);
  };

  const handleRevert = async () => {
    setConfirmRevert(false);
    await revertToMessage(message.id);
    toast.success("Reverted to this message");
  };

  if (isEditing) {
    return (
      <div className="mt-2 flex flex-col gap-2">
        <textarea
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          className="min-h-[60px] w-full resize-y rounded-lg border border-border bg-background p-2.5 text-sm text-foreground focus:border-primary/50 focus:outline-none"
        />
        <div className="flex gap-1.5">
          <button
            onClick={handleEdit}
            className="flex h-7 items-center gap-1 rounded-md bg-primary/15 px-2.5 text-xs font-medium text-primary transition-colors hover:bg-primary/25"
          >
            <Check className="h-3 w-3" /> Save
          </button>
          <button
            onClick={() => {
              setIsEditing(false);
              setEditContent(message.content);
            }}
            className="hover-surface flex h-7 items-center gap-1 rounded-md px-2.5 text-xs text-muted-foreground"
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
          className="h-6 rounded-md bg-destructive/15 px-2 text-[11px] font-medium text-destructive transition-colors hover:bg-destructive/25"
        >
          Yes
        </button>
        <button
          onClick={() => setConfirmDelete(false)}
          className="hover-surface h-6 rounded-md px-2 text-[11px] text-muted-foreground"
        >
          No
        </button>
      </div>
    );
  }

  if (confirmRevert) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] text-muted-foreground">
          Revert here? Messages below will be deleted.
        </span>
        <button
          onClick={handleRevert}
          className="h-6 rounded-md bg-destructive/15 px-2 text-[11px] font-medium text-destructive transition-colors hover:bg-destructive/25"
        >
          Yes
        </button>
        <button
          onClick={() => setConfirmRevert(false)}
          className="hover-surface h-6 rounded-md px-2 text-[11px] text-muted-foreground"
        >
          No
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-0.5">
      <ActionBtn onClick={handleCopy} title="Copy">
        {copied ? (
          <Check className="h-3 w-3 text-primary" />
        ) : (
          <Copy className="h-3 w-3" />
        )}
      </ActionBtn>

      <ActionBtn onClick={() => setIsEditing(true)} title="Edit">
        <Pencil className="h-3 w-3" />
      </ActionBtn>

      {message.role === "assistant" && (
        <ActionBtn
          onClick={() => regenerateMessage(message.id)}
          title="Regenerate"
        >
          <RefreshCw className="h-3 w-3" />
        </ActionBtn>
      )}

      {!isLastMessage && (
        <ActionBtn
          onClick={() => setConfirmRevert(true)}
          title="Revert to here"
        >
          <Undo2 className="h-3 w-3" />
        </ActionBtn>
      )}

      <ActionBtn
        onClick={() => setConfirmDelete(true)}
        title="Delete"
        className="hover:text-destructive"
      >
        <Trash2 className="h-3 w-3" />
      </ActionBtn>
    </div>
  );
}

function ActionBtn({
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
      className={cn(
        "hover-surface flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground/40 transition-colors hover:text-foreground",
        className
      )}
    >
      {children}
    </button>
  );
}
