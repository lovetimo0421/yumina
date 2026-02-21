import { useState, useRef, useCallback, useEffect } from "react";
import { Send, Square, Plus, X, RotateCcw, Image as ImageIcon, FastForward, Bookmark, History, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useChatStore, type Attachment } from "@/stores/chat";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

export function MessageInput() {
  const [content, setContent] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [confirmRestart, setConfirmRestart] = useState(false);
  const [showCheckpoints, setShowCheckpoints] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    sendMessage,
    stopGeneration,
    restartChat,
    continueLastMessage,
    isStreaming,
    messages: chatMessages,
    pendingChoices,
    clearPendingChoices,
    checkpoints,
    saveCheckpoint,
    loadCheckpoints,
    restoreCheckpoint,
    deleteCheckpoint,
  } = useChatStore();

  const handleSend = useCallback(() => {
    const trimmed = content.trim();
    if (!trimmed && attachments.length === 0) return;
    if (isStreaming) return;
    sendMessage(trimmed || "(image)", undefined, attachments.length > 0 ? attachments : undefined);
    setContent("");
    setAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [content, attachments, isStreaming, sendMessage]);

  const handleChoiceClick = useCallback(
    (choice: string) => {
      if (isStreaming) return;
      sendMessage(choice);
      setContent("");
    },
    [isStreaming, sendMessage]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        toast.error(`Unsupported file type: ${file.type}`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`File too large: ${file.name} (max 10MB)`);
        continue;
      }

      const base64 = await fileToBase64(file);
      setAttachments((prev) => [
        ...prev,
        { type: "image", mimeType: file.type, name: file.name, data: base64 },
      ]);
    }

    // Reset input so same file can be selected again
    e.target.value = "";
  }, []);

  const removeAttachment = useCallback((index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleRestart = useCallback(async () => {
    setConfirmRestart(false);
    await restartChat();
    toast.success("Chat restarted");
  }, [restartChat]);

  const handleContinue = useCallback(() => {
    if (isStreaming) return;
    const hasAssistant = chatMessages.some((m) => m.role === "assistant");
    if (!hasAssistant) {
      toast.error("No assistant message to continue");
      return;
    }
    continueLastMessage();
  }, [isStreaming, chatMessages, continueLastMessage]);

  const handleSaveCheckpoint = useCallback(async () => {
    await saveCheckpoint();
    toast.success("Checkpoint saved");
  }, [saveCheckpoint]);

  const handleOpenCheckpoints = useCallback(async () => {
    await loadCheckpoints();
    setShowCheckpoints(true);
  }, [loadCheckpoints]);

  const handleRestore = useCallback(async (checkpointId: string) => {
    setConfirmRestore(null);
    setShowCheckpoints(false);
    await restoreCheckpoint(checkpointId);
    toast.success("Checkpoint restored");
  }, [restoreCheckpoint]);

  const handleDeleteCheckpoint = useCallback(async (checkpointId: string) => {
    await deleteCheckpoint(checkpointId);
    toast.success("Checkpoint deleted");
  }, [deleteCheckpoint]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  }, [content]);

  return (
    <div className="shrink-0 px-4 pb-4 pt-2">
      <div className="mx-auto max-w-3xl">
        {/* Choice buttons */}
        {pendingChoices.length > 0 && !isStreaming && (
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            {pendingChoices.map((choice, i) => (
              <button
                key={i}
                onClick={() => handleChoiceClick(choice)}
                className={cn(
                  "rounded-lg border border-border/50 bg-accent px-3 py-1.5 text-xs font-medium text-foreground/80",
                  "transition-colors hover:border-primary/30 hover:bg-primary/10 hover:text-primary"
                )}
              >
                {choice}
              </button>
            ))}
            <button
              onClick={clearPendingChoices}
              className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground/30 transition-colors hover:text-muted-foreground/60"
              title="Dismiss choices"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* Attachment previews */}
        {attachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {attachments.map((att, i) => (
              <div key={i} className="group relative">
                <img
                  src={`data:${att.mimeType};base64,${att.data}`}
                  alt={att.name}
                  className="h-16 w-16 rounded-lg border border-border object-cover"
                />
                <button
                  onClick={() => removeAttachment(i)}
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Glass reply bar card */}
        <div className="glass overflow-hidden rounded-2xl">
          {/* Restart confirmation banner */}
          {confirmRestart && (
            <div className="flex items-center justify-between border-b border-border/50 bg-destructive/5 px-4 py-2">
              <span className="text-xs text-foreground/70">
                Clear all messages and reset the world?
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleRestart}
                  className="rounded-md bg-destructive/15 px-2.5 py-1 text-xs font-medium text-destructive transition-colors hover:bg-destructive/25"
                >
                  Restart
                </button>
                <button
                  onClick={() => setConfirmRestart(false)}
                  className="rounded-md px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Checkpoint list panel */}
          {showCheckpoints && (
            <div className="border-b border-border/50 bg-muted/30 px-4 py-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-foreground/70">Checkpoints</span>
                <button
                  onClick={() => { setShowCheckpoints(false); setConfirmRestore(null); }}
                  className="flex h-5 w-5 items-center justify-center rounded-md text-muted-foreground/50 transition-colors hover:text-muted-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
              {checkpoints.length === 0 ? (
                <p className="text-xs text-muted-foreground/50 pb-1">No checkpoints saved yet.</p>
              ) : (
                <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
                  {checkpoints.map((cp) => (
                    <div
                      key={cp.id}
                      className="flex items-center justify-between rounded-lg bg-background/50 px-3 py-1.5 text-xs"
                    >
                      <div className="flex flex-col min-w-0">
                        <span className="font-medium text-foreground/80 truncate">{cp.name}</span>
                        <span className="text-muted-foreground/50">
                          {cp.messageCount} messages &middot; {timeAgo(cp.createdAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 ml-2 shrink-0">
                        {confirmRestore === cp.id ? (
                          <>
                            <button
                              onClick={() => handleRestore(cp.id)}
                              className="rounded-md bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary transition-colors hover:bg-primary/25"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setConfirmRestore(null)}
                              className="rounded-md px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-muted"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => setConfirmRestore(cp.id)}
                              className="rounded-md px-2 py-0.5 text-xs text-foreground/60 transition-colors hover:bg-primary/10 hover:text-primary"
                              title="Restore this checkpoint"
                            >
                              Restore
                            </button>
                            <button
                              onClick={() => handleDeleteCheckpoint(cp.id)}
                              className="flex h-5 w-5 items-center justify-center rounded-md text-muted-foreground/30 transition-colors hover:text-destructive"
                              title="Delete checkpoint"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Textarea — full width */}
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isStreaming
                ? "Generating..."
                : pendingChoices.length > 0
                  ? "Pick a choice above, or type your own action..."
                  : "Type whatever you want to do in this world!"
            }
            disabled={isStreaming}
            rows={1}
            className="block w-full resize-none bg-transparent px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none disabled:opacity-30"
          />

          {/* Bottom row: + button (left) | send (right) */}
          <div className="flex items-center justify-between px-3 pb-2.5">
            {/* Left: plus menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="hover-surface flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground"
                  title="Actions"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" side="top">
                <DropdownMenuItem onClick={handleContinue}>
                  <FastForward className="mr-2 h-4 w-4" />
                  Continue
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setConfirmRestart(true)}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Restart Chat
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSaveCheckpoint}>
                  <Bookmark className="mr-2 h-4 w-4" />
                  Save Checkpoint
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleOpenCheckpoints}>
                  <History className="mr-2 h-4 w-4" />
                  Load Checkpoint
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                  <ImageIcon className="mr-2 h-4 w-4" />
                  Attach Image
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_IMAGE_TYPES.join(",")}
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* Right: send/stop */}
            <div className="flex items-center gap-2">
              {isStreaming ? (
                <button
                  onClick={stopGeneration}
                  className="hover-surface-strong flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground"
                  title="Stop generation"
                >
                  <Square className="h-4 w-4" />
                </button>
              ) : (
                <button
                  onClick={handleSend}
                  disabled={!content.trim() && attachments.length === 0}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity disabled:opacity-20 disabled:pointer-events-none"
                  title="Send message"
                >
                  <Send className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip the data:...;base64, prefix
      const base64 = result.split(",")[1] ?? "";
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;

  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
