const OPENAI_BASE = "https://api.openai.com/v1";
const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMENSIONS = 1536;

export { EMBEDDING_DIMENSIONS };

/**
 * Generate embeddings for an array of texts using OpenAI's embedding API.
 * Returns an array of float arrays in the same order as the input.
 */
export async function generateEmbeddings(
  texts: string[],
  apiKey: string
): Promise<number[][]> {
  if (texts.length === 0) return [];

  // OpenAI supports batch embedding (up to ~2048 inputs)
  const response = await fetch(`${OPENAI_BASE}/embeddings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: texts,
      dimensions: EMBEDDING_DIMENSIONS,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Embedding failed (${response.status}): ${error}`);
  }

  const json = (await response.json()) as {
    data: Array<{ embedding: number[]; index: number }>;
  };

  // Sort by index to match input order
  return json.data
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding);
}

/**
 * Generate an embedding for a single text.
 */
export async function generateEmbedding(
  text: string,
  apiKey: string
): Promise<number[]> {
  const results = await generateEmbeddings([text], apiKey);
  return results[0]!;
}

/**
 * Compute cosine similarity between two vectors.
 * Returns a value between -1 and 1 (higher = more similar).
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i]! * b[i]!;
    normA += a[i]! * a[i]!;
    normB += b[i]! * b[i]!;
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

/**
 * Simple content hash for change detection.
 */
export function hashContent(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return hash.toString(36);
}
