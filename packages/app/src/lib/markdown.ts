import DOMPurify from "dompurify";
import type { DisplayTransform } from "@yumina/engine";

/**
 * Render a chat message to safe HTML.
 *
 * Pipeline:
 *   1. Protect code blocks / inline code from processing
 *   2. Escape HTML in non-code regions
 *   3. Apply built-in markdown (bold, italic, line breaks)
 *   4. Restore code blocks
 *   5. Apply world-defined display transforms (can produce HTML)
 *   6. Sanitize with DOMPurify
 */
export function renderMessage(
  raw: string,
  transforms: DisplayTransform[] = [],
): string {
  // ── 1. Extract code blocks + inline code ───────────────────────────
  const codeBlocks: string[] = [];
  let html = raw;

  // Fenced code blocks ```...```
  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_match, _lang, code) => {
    const idx = codeBlocks.length;
    codeBlocks.push(
      `<pre class="my-2 rounded bg-black/30 p-3 text-sm overflow-x-auto"><code>${escapeHtml(code)}</code></pre>`,
    );
    return `\x00CB${idx}\x00`;
  });

  // Inline code `...`
  html = html.replace(/`([^`]+)`/g, (_match, code) => {
    const idx = codeBlocks.length;
    codeBlocks.push(
      `<code class="rounded bg-black/30 px-1.5 py-0.5 text-sm">${escapeHtml(code)}</code>`,
    );
    return `\x00CB${idx}\x00`;
  });

  // ── 2. Escape HTML in remaining text ───────────────────────────────
  html = escapeHtml(html);

  // ── 3. Built-in markdown ───────────────────────────────────────────
  // Bold + italic: ***...***
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
  // Bold: **...**
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  // Italic: *...*
  html = html.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "<em>$1</em>");
  // Line breaks
  html = html.replace(/\n/g, "<br />");

  // ── 4. Restore code blocks ─────────────────────────────────────────
  html = html.replace(/\x00CB(\d+)\x00/g, (_match, idx) => codeBlocks[Number(idx)] ?? "");

  // ── 5. World-defined display transforms ────────────────────────────
  const sorted = transforms
    .filter((t) => t.enabled)
    .sort((a, b) => a.order - b.order);

  for (const t of sorted) {
    try {
      const regex = new RegExp(t.pattern, t.flags ?? "g");
      html = html.replace(regex, t.replacement);
    } catch {
      // skip invalid regex
    }
  }

  // ── 6. Sanitize ────────────────────────────────────────────────────
  html = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "span", "div", "img", "strong", "em", "br", "hr", "button",
      "p", "pre", "code", "b", "i", "a",
    ],
    ALLOWED_ATTR: [
      "class", "style", "src", "alt", "data-yumina-choice", "href", "target",
    ],
  });

  return html;
}

/** Legacy export — calls renderMessage with no transforms */
export function renderMarkdown(text: string): string {
  return renderMessage(text);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
