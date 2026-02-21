import type { Message, SessionData } from "@/stores/chat";

function triggerDownload(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 60);
}

export function exportAsMarkdown(session: SessionData, messages: Message[]) {
  const worldName = session.world?.name ?? "Chat";
  const lines: string[] = [`# ${worldName}\n`];

  for (const msg of messages) {
    if (msg.role === "system") continue;
    const label = msg.role === "user" ? "**User**" : "**Assistant**";
    lines.push(`${label}: ${msg.content}\n`);
  }

  const filename = `${sanitizeFilename(worldName)}.md`;
  triggerDownload(lines.join("\n"), filename, "text/markdown");
}

export function exportAsJson(session: SessionData, messages: Message[]) {
  const worldName = session.world?.name ?? "Chat";
  const payload = {
    worldName,
    worldId: session.worldId,
    sessionId: session.id,
    exportedAt: new Date().toISOString(),
    messages: messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role,
        content: m.content,
        createdAt: m.createdAt,
        model: m.model ?? undefined,
      })),
  };

  const filename = `${sanitizeFilename(worldName)}.json`;
  triggerDownload(JSON.stringify(payload, null, 2), filename, "application/json");
}
