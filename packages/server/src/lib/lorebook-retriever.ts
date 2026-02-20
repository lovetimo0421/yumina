import type { WorldEntry, GameState, WorldSettings } from "@yumina/engine";
import { LorebookMatcher } from "@yumina/engine";
import type { LorebookMatchResult } from "@yumina/engine";

const matcher = new LorebookMatcher();

interface RetrievalOptions {
  entries: WorldEntry[];
  recentMessages: string[];
  state: GameState;
  tokenBudget: number;
  settings?: Partial<Pick<WorldSettings, "lorebookRecursionDepth">>;
}

/**
 * Deterministic lorebook retrieval — delegates entirely to the engine matcher.
 * Synchronous, no external API calls.
 */
export function retrieveLorebookEntries(
  options: RetrievalOptions
): LorebookMatchResult {
  return matcher.matchWithBudget(
    options.entries,
    options.recentMessages,
    options.state,
    options.tokenBudget,
    options.settings
  );
}
