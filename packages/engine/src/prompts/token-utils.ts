/** Rough token estimate: 1 token ~ 4 characters */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
