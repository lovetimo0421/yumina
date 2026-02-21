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

  // ── 3. Built-in markdown (bold, italic — NO line breaks yet) ──────
  // Bold + italic: ***...***
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
  // Bold: **...**
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  // Italic: *...*
  html = html.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "<em>$1</em>");

  // ── 4. Restore code blocks ─────────────────────────────────────────
  html = html.replace(/\x00CB(\d+)\x00/g, (_match, idx) => codeBlocks[Number(idx)] ?? "");

  // ── 5. World-defined display transforms ────────────────────────────
  // Transforms run BEFORE \n→<br/> so multiline patterns (^$, m flag) work
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

  // ── 5.5. Line breaks (after transforms so multiline patterns work) ─
  html = html.replace(/\n/g, "<br />");

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

/**
 * Pre-resolve @asset:{id} references in display transform replacements.
 * Call this once when session loads, cache the result.
 * Returns a new transforms array with @asset: refs replaced by presigned URLs.
 */
export async function resolveTransformAssets(
  transforms: DisplayTransform[],
): Promise<DisplayTransform[]> {
  const hasAssetRef = transforms.some((t) => t.replacement.includes("@asset:"));
  if (!hasAssetRef) return transforms;

  const { resolveAssetRefs } = await import("./asset-url");
  return Promise.all(
    transforms.map(async (t) => {
      if (!t.replacement.includes("@asset:")) return t;
      return { ...t, replacement: await resolveAssetRefs(t.replacement) };
    }),
  );
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
