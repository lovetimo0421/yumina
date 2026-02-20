/**
 * Simple markdown-to-HTML renderer for chat messages.
 * Supports: bold, italic, code, code blocks, line breaks.
 * Uses a sanitization approach to prevent XSS.
 */
export function renderMarkdown(text: string): string {
  let html = escapeHtml(text);

  // Code blocks: ```...```
  html = html.replace(
    /```(\w*)\n([\s\S]*?)```/g,
    '<pre class="my-2 rounded bg-black/30 p-3 text-sm overflow-x-auto"><code>$2</code></pre>'
  );

  // Inline code: `...`
  html = html.replace(
    /`([^`]+)`/g,
    '<code class="rounded bg-black/30 px-1.5 py-0.5 text-sm">$1</code>'
  );

  // Bold + italic: ***...***
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");

  // Bold: **...**
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  // Italic: *...*
  html = html.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "<em>$1</em>");

  // Line breaks
  html = html.replace(/\n/g, "<br />");

  return html;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
