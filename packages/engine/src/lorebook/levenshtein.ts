/**
 * Compute the Levenshtein edit distance between two strings.
 * Uses a single-row DP approach for O(min(m,n)) space.
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  // Ensure a is the shorter string for space efficiency
  if (a.length > b.length) {
    [a, b] = [b, a];
  }

  const aLen = a.length;
  const bLen = b.length;
  const row = new Array<number>(aLen + 1);

  for (let i = 0; i <= aLen; i++) row[i] = i;

  for (let j = 1; j <= bLen; j++) {
    let prev = row[0]!;
    row[0] = j;
    for (let i = 1; i <= aLen; i++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const temp = row[i]!;
      row[i] = Math.min(
        row[i]! + 1,       // deletion
        row[i - 1]! + 1,   // insertion
        prev + cost         // substitution
      );
      prev = temp;
    }
  }

  return row[aLen]!;
}

/**
 * Fuzzy match: returns true if needle is "close enough" to target.
 * Threshold: edit distance <= 1 for keywords <= 5 chars, <= 2 for longer.
 */
export function fuzzyMatch(needle: string, target: string): boolean {
  const threshold = needle.length <= 5 ? 1 : 2;
  return levenshteinDistance(needle, target) <= threshold;
}
