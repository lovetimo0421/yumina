import type { WorldEntry, Condition, GameState, WorldSettings } from "../types/index.js";
import { keywordMatches } from "./keyword-matcher.js";

/** Rough token estimate: 1 token ~ 4 characters */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export interface LorebookMatchResult {
  /** Entries that always inject (alwaysSend=true), not subject to token budget */
  alwaysSend: WorldEntry[];
  /** Entries matched by keyword/condition, trimmed to fit token budget */
  triggered: WorldEntry[];
  /** Total estimated tokens used by triggered entries */
  triggeredTokens: number;
}

interface ScoredEntry {
  entry: WorldEntry;
  score: number;
}

/**
 * Matches world entries against recent messages and game state.
 * Supports fuzzy matching, whole-word matching, secondary keywords,
 * entry groups, and recursive cascading triggers.
 */
export class LorebookMatcher {
  /**
   * Full match with token budgeting.
   * @param entries All entries for this world (filters out greeting/disabled internally)
   * @param recentMessages Recent message texts to scan for keywords
   * @param state Current game state for condition evaluation
   * @param tokenBudget Max tokens for triggered entries (default 2048)
   * @param settings Optional world settings (for recursion depth)
   */
  matchWithBudget(
    entries: WorldEntry[],
    recentMessages: string[],
    state: GameState,
    tokenBudget = 2048,
    settings?: Partial<Pick<WorldSettings, "lorebookRecursionDepth">>
  ): LorebookMatchResult {
    const recursionDepth = Math.min(
      Math.max(settings?.lorebookRecursionDepth ?? 0, 0),
      10
    );

    // 1. SEPARATE: alwaysSend vs candidates
    const alwaysSend: WorldEntry[] = [];
    const candidates: WorldEntry[] = [];

    for (const entry of entries) {
      if (!entry.enabled) continue;
      if (entry.position === "greeting") continue;

      if (entry.alwaysSend) {
        alwaysSend.push(entry);
      } else {
        candidates.push(entry);
      }
    }

    if (candidates.length === 0) {
      return { alwaysSend, triggered: [], triggeredTokens: 0 };
    }

    // 2. ITERATIVE SCAN with recursion
    let textToScan = recentMessages.join(" ");
    const activatedIds = new Set<string>();
    const scoredEntries: ScoredEntry[] = [];

    for (let depth = 0; depth <= recursionDepth; depth++) {
      const newlyActivated: ScoredEntry[] = [];

      for (const entry of candidates) {
        if (activatedIds.has(entry.id)) continue;

        // Skip entries excluded from recursion (depth > 0 = recursion scan)
        if (depth > 0 && entry.excludeRecursion) continue;

        // Check state conditions first (cheap)
        if (
          entry.conditions.length > 0 &&
          !this.checkConditions(state, entry.conditions, entry.conditionLogic)
        ) {
          continue;
        }

        // Check primary keywords
        const wholeWord = entry.matchWholeWords ?? false;
        const useFuzzy = entry.useFuzzyMatch ?? false;

        if (entry.keywords.length === 0) continue;

        let matchedPrimaryCount = 0;
        for (const kw of entry.keywords) {
          if (keywordMatches(textToScan, kw, wholeWord, useFuzzy)) {
            matchedPrimaryCount++;
          }
        }

        if (matchedPrimaryCount === 0) continue;

        // Check secondary keywords
        const secondaryKws = entry.secondaryKeywords ?? [];
        const secondaryLogic = entry.secondaryKeywordLogic ?? "AND_ANY";

        if (secondaryKws.length > 0) {
          const secondaryMatches = secondaryKws.filter((kw) =>
            keywordMatches(textToScan, kw, wholeWord, useFuzzy)
          );
          const matchedCount = secondaryMatches.length;
          const totalCount = secondaryKws.length;

          let secondaryPass = false;
          switch (secondaryLogic) {
            case "AND_ANY":
              secondaryPass = matchedCount > 0;
              break;
            case "AND_ALL":
              secondaryPass = matchedCount === totalCount;
              break;
            case "NOT_ANY":
              secondaryPass = matchedCount === 0;
              break;
            case "NOT_ALL":
              secondaryPass = matchedCount < totalCount;
              break;
          }

          if (!secondaryPass) continue;
        }

        // Score: primary match count + secondary bonus
        const secondaryScore = secondaryKws.length > 0 ? 1 : 0;
        const score = matchedPrimaryCount + secondaryScore;

        newlyActivated.push({ entry, score });
      }

      if (newlyActivated.length === 0) break; // Stop recursion early

      // Record activations
      for (const scored of newlyActivated) {
        activatedIds.add(scored.entry.id);
        scoredEntries.push(scored);
      }

      // Append activated content to scan text for next recursion depth
      // (unless entry has preventRecursion)
      if (depth < recursionDepth) {
        const newContent = newlyActivated
          .filter((s) => !s.entry.preventRecursion)
          .map((s) => s.entry.content)
          .join(" ");
        if (newContent) {
          textToScan = textToScan + " " + newContent;
        }
      }
    }

    // 3. GROUP RESOLUTION
    const ungrouped: ScoredEntry[] = [];
    const groups = new Map<string, ScoredEntry[]>();

    for (const scored of scoredEntries) {
      const group = scored.entry.group;
      if (!group) {
        ungrouped.push(scored);
      } else {
        const arr = groups.get(group);
        if (arr) {
          arr.push(scored);
        } else {
          groups.set(group, [scored]);
        }
      }
    }

    // Pick winner from each group: highest score, tiebreak by priority
    const resolved: ScoredEntry[] = [...ungrouped];
    for (const members of groups.values()) {
      members.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return b.entry.priority - a.entry.priority;
      });
      resolved.push(members[0]!);
    }

    // 4. SORT: priority desc, then score desc
    resolved.sort((a, b) => {
      if (b.entry.priority !== a.entry.priority) {
        return b.entry.priority - a.entry.priority;
      }
      return b.score - a.score;
    });

    // 5. BUDGET: fill from top until token budget exhausted
    const budgeted: WorldEntry[] = [];
    let usedTokens = 0;

    for (const { entry } of resolved) {
      const entryTokens = estimateTokens(entry.content);
      if (usedTokens + entryTokens > tokenBudget && budgeted.length > 0) {
        break;
      }
      budgeted.push(entry);
      usedTokens += entryTokens;
    }

    return {
      alwaysSend,
      triggered: budgeted,
      triggeredTokens: usedTokens,
    };
  }

  /**
   * Legacy match method — returns flat array (always-send + triggered combined).
   */
  match(
    entries: WorldEntry[],
    recentMessages: string[],
    state: GameState
  ): WorldEntry[] {
    const result = this.matchWithBudget(entries, recentMessages, state);
    return [...result.alwaysSend, ...result.triggered];
  }

  checkConditions(
    state: GameState,
    conditions: Condition[],
    logic: "all" | "any"
  ): boolean {
    if (conditions.length === 0) return true;

    if (logic === "all") {
      return conditions.every((c) => this.evaluateCondition(state, c));
    }
    return conditions.some((c) => this.evaluateCondition(state, c));
  }

  private evaluateCondition(state: GameState, condition: Condition): boolean {
    const current = state.variables[condition.variableId];
    if (current === undefined) return false;

    const target = condition.value;

    switch (condition.operator) {
      case "eq":
        return current === target;
      case "neq":
        return current !== target;
      case "gt":
        return typeof current === "number" && typeof target === "number"
          ? current > target
          : false;
      case "gte":
        return typeof current === "number" && typeof target === "number"
          ? current >= target
          : false;
      case "lt":
        return typeof current === "number" && typeof target === "number"
          ? current < target
          : false;
      case "lte":
        return typeof current === "number" && typeof target === "number"
          ? current <= target
          : false;
      case "contains":
        return typeof current === "string" && typeof target === "string"
          ? current.includes(target)
          : false;
      default:
        return false;
    }
  }
}
