import { fuzzyMatch } from "./levenshtein.js";

/** Regex to detect CJK characters (Chinese, Japanese, Korean) */
const CJK_RE = /[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/;

/** Regex to detect a user-supplied regex pattern like /pattern/flags */
const USER_REGEX_RE = /^\/(.+)\/([gimsuy]*)$/;

/**
 * Check if a single keyword matches anywhere in the text.
 *
 * Match chain:
 * 1. If keyword looks like `/regex/flags` → try regex match
 * 2. If `wholeWord` → word boundary regex `\bkeyword\b`
 * 3. Else → substring `text.includes(keyword)` (current behavior)
 * 4. If none matched AND `useFuzzy` AND keyword is NOT CJK →
 *    split text into words, Levenshtein each against keyword
 *
 * All matching is case-insensitive.
 */
export function keywordMatches(
  text: string,
  keyword: string,
  wholeWord: boolean,
  useFuzzy: boolean
): boolean {
  const lowerText = text.toLowerCase();
  const lowerKeyword = keyword.toLowerCase();

  // 1. User-supplied regex: /pattern/flags
  const regexMatch = USER_REGEX_RE.exec(keyword);
  if (regexMatch) {
    try {
      const flags = regexMatch[2]!.includes("i") ? regexMatch[2]! : regexMatch[2]! + "i";
      const re = new RegExp(regexMatch[1]!, flags);
      if (re.test(text)) return true;
    } catch {
      // Invalid regex — fall through to substring
    }
  }

  // 2. Whole-word matching
  if (wholeWord) {
    try {
      const escaped = lowerKeyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(`\\b${escaped}\\b`, "i");
      if (re.test(text)) return true;
    } catch {
      // Fall through
    }
  } else {
    // 3. Substring matching (default)
    if (lowerText.includes(lowerKeyword)) return true;
  }

  // 4. Fuzzy matching (Levenshtein)
  if (useFuzzy && !CJK_RE.test(keyword)) {
    const words = lowerText.split(/\s+/);
    for (const word of words) {
      if (word.length === 0) continue;
      if (fuzzyMatch(lowerKeyword, word)) return true;
    }
  }

  return false;
}
