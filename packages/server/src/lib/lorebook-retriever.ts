import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { lorebookEmbeddings } from "../db/schema.js";
import { cosineSimilarity, generateEmbedding } from "./llm/embeddings.js";
import { bm25Score, normalizeScores } from "./llm/bm25.js";
import type { LorebookEntry, GameState } from "@yumina/engine";
import { LorebookMatcher } from "@yumina/engine";
import type { LorebookMatchResult } from "@yumina/engine";

const BM25_WEIGHT = 0.4;
const VECTOR_WEIGHT = 0.6;
const VECTOR_THRESHOLD = 0.3; // minimum cosine similarity to consider

const matcher = new LorebookMatcher();

interface RetrievalOptions {
  entries: LorebookEntry[];
  recentMessages: string[];
  state: GameState;
  tokenBudget: number;
  worldId: string;
  openaiApiKey?: string | null;
}

/**
 * Hybrid lorebook retrieval: combines BM25 keyword scoring with
 * vector cosine similarity. Falls back to keyword-only if no
 * embeddings are available.
 */
export async function retrieveLorebookEntries(
  options: RetrievalOptions
): Promise<LorebookMatchResult> {
  const { entries, recentMessages, state, tokenBudget, worldId, openaiApiKey } = options;

  // Separate always-send entries first
  const alwaysSend = entries.filter((e) => e.enabled && e.alwaysSend);
  const candidates = entries.filter((e) => e.enabled && !e.alwaysSend);

  if (candidates.length === 0) {
    return { alwaysSend, triggered: [], triggeredTokens: 0 };
  }

  const queryText = recentMessages.join(" ");

  // BM25 scoring against entry content + keywords
  const bm25Docs = candidates.map((e) => ({
    id: e.id,
    text: `${e.name} ${e.keywords.join(" ")} ${e.content}`,
  }));
  const rawBm25 = bm25Score(queryText, bm25Docs);
  const bm25Scores = normalizeScores(rawBm25);

  // Vector similarity scoring (if embeddings exist)
  let vectorScores = new Map<string, number>();

  if (openaiApiKey) {
    try {
      const embeddingRows = await db
        .select()
        .from(lorebookEmbeddings)
        .where(eq(lorebookEmbeddings.worldId, worldId));

      if (embeddingRows.length > 0) {
        const queryEmbedding = await generateEmbedding(queryText, openaiApiKey);

        for (const row of embeddingRows) {
          const similarity = cosineSimilarity(queryEmbedding, row.embedding);
          if (similarity >= VECTOR_THRESHOLD) {
            vectorScores.set(row.entryId, similarity);
          }
        }
      }
    } catch {
      // Vector search failed — fall back to BM25 only
      vectorScores = new Map();
    }
  }

  // Combine scores
  const combinedScores = new Map<string, number>();
  const allIds = new Set([...bm25Scores.keys(), ...vectorScores.keys()]);

  for (const id of allIds) {
    const bm25 = bm25Scores.get(id) ?? 0;
    const vector = vectorScores.get(id) ?? 0;

    // If we have both signals, use weighted combination
    // If only one signal, use it with reduced weight
    let score: number;
    if (bm25 > 0 && vector > 0) {
      score = BM25_WEIGHT * bm25 + VECTOR_WEIGHT * vector;
    } else if (vector > 0) {
      score = vector * 0.8; // semantic-only match, slight penalty
    } else {
      score = bm25 * 0.7; // keyword-only match, slight penalty
    }

    combinedScores.set(id, score);
  }

  // Also include entries matched by the engine's existing keyword matcher
  // (substring matching that BM25 might miss for short keywords)
  const keywordResult = matcher.matchWithBudget(
    candidates,
    recentMessages,
    state,
    Infinity // no budget here — we'll budget the combined results
  );

  for (const entry of keywordResult.triggered) {
    if (!combinedScores.has(entry.id)) {
      combinedScores.set(entry.id, 0.5); // keyword-matched but not in BM25/vector
    }
  }

  // Check conditions and budget
  const scoredEntries = candidates
    .filter((e) => combinedScores.has(e.id))
    .map((e) => ({ entry: e, score: combinedScores.get(e.id)! }))
    .sort((a, b) => {
      // Primary: priority (higher first), secondary: score (higher first)
      if (b.entry.priority !== a.entry.priority) {
        return b.entry.priority - a.entry.priority;
      }
      return b.score - a.score;
    });

  // Apply condition checks + token budgeting
  const triggered: LorebookEntry[] = [];
  let usedTokens = 0;

  for (const { entry } of scoredEntries) {
    // Check state conditions
    if (entry.conditions.length > 0) {
      const condResult = matcher.matchWithBudget([entry], recentMessages, state, Infinity);
      if (condResult.triggered.length === 0) continue;
    }

    const entryTokens = Math.ceil(entry.content.length / 4);
    if (usedTokens + entryTokens > tokenBudget && triggered.length > 0) {
      break;
    }
    triggered.push(entry);
    usedTokens += entryTokens;
  }

  return { alwaysSend, triggered, triggeredTokens: usedTokens };
}
