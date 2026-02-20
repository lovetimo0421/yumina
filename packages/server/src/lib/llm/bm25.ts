/**
 * Simple BM25 scoring for lorebook entry matching.
 * Operates in-memory since entry counts per world are small (dozens to low hundreds).
 */

const K1 = 1.2;
const B = 0.75;

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

interface BM25Document {
  id: string;
  tokens: string[];
  length: number;
}

/**
 * Score a query against a set of documents using BM25.
 * Returns a map of document ID → score (higher = more relevant).
 */
export function bm25Score(
  query: string,
  documents: Array<{ id: string; text: string }>
): Map<string, number> {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0 || documents.length === 0) {
    return new Map();
  }

  const docs: BM25Document[] = documents.map((d) => {
    const tokens = tokenize(d.text);
    return { id: d.id, tokens, length: tokens.length };
  });

  const N = docs.length;
  const avgDl = docs.reduce((sum, d) => sum + d.length, 0) / N;

  // Document frequency for each term
  const df = new Map<string, number>();
  for (const doc of docs) {
    const seen = new Set<string>();
    for (const token of doc.tokens) {
      if (!seen.has(token)) {
        df.set(token, (df.get(token) ?? 0) + 1);
        seen.add(token);
      }
    }
  }

  const scores = new Map<string, number>();

  for (const doc of docs) {
    let score = 0;

    // Term frequency in this document
    const tf = new Map<string, number>();
    for (const token of doc.tokens) {
      tf.set(token, (tf.get(token) ?? 0) + 1);
    }

    for (const term of queryTokens) {
      const termFreq = tf.get(term) ?? 0;
      if (termFreq === 0) continue;

      const docFreq = df.get(term) ?? 0;
      const idf = Math.log((N - docFreq + 0.5) / (docFreq + 0.5) + 1);

      const numerator = termFreq * (K1 + 1);
      const denominator = termFreq + K1 * (1 - B + B * (doc.length / avgDl));

      score += idf * (numerator / denominator);
    }

    if (score > 0) {
      scores.set(doc.id, score);
    }
  }

  return scores;
}

/**
 * Normalize a score map to 0-1 range.
 */
export function normalizeScores(scores: Map<string, number>): Map<string, number> {
  if (scores.size === 0) return scores;

  let max = 0;
  for (const score of scores.values()) {
    if (score > max) max = score;
  }

  if (max === 0) return scores;

  const normalized = new Map<string, number>();
  for (const [id, score] of scores) {
    normalized.set(id, score / max);
  }
  return normalized;
}
