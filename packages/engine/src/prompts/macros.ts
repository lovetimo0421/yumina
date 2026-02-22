import type { WorldDefinition, GameState } from "../types/index.js";

/**
 * Context values pre-computed by the server before prompt assembly.
 * Stored in GameState.metadata so macros can reference them.
 */
export interface MacroContext {
  lastUserMessageAt?: string;
  lastMessage?: string;
  lastUserMessage?: string;
  lastCharMessage?: string;
  model?: string;
}

// ── Macro handler interface ──

interface MacroHandler {
  /** Try to match the inner text. Returns capture groups or null. */
  match(inner: string): string[] | null;
  /** Produce the replacement string. */
  resolve(groups: string[], ctx: MacroResolveContext): string;
}

interface MacroResolveContext {
  charName: string;
  userName: string;
  world: WorldDefinition;
  state: GameState;
  macroIndex: number;
}

// ── Handlers ──

const commentHandler: MacroHandler = {
  match(inner) {
    return inner.startsWith("//") ? [inner] : null;
  },
  resolve() {
    return "";
  },
};

const trimHandler: MacroHandler = {
  match(inner) {
    return inner === "trim" ? [] : null;
  },
  resolve() {
    return "\x00TRIM\x00";
  },
};

const charHandler: MacroHandler = {
  match(inner) {
    return inner === "char" ? [] : null;
  },
  resolve(_g, ctx) {
    return ctx.charName;
  },
};

const userHandler: MacroHandler = {
  match(inner) {
    return inner === "user" ? [] : null;
  },
  resolve(_g, ctx) {
    return ctx.userName;
  },
};

const turnCountHandler: MacroHandler = {
  match(inner) {
    return inner === "turnCount" ? [] : null;
  },
  resolve(_g, ctx) {
    return String(ctx.state.turnCount ?? 0);
  },
};

const randomHandler: MacroHandler = {
  match(inner) {
    if (!inner.startsWith("random::")) return null;
    const items = inner.slice(8).split("::");
    return items.length >= 1 ? items : null;
  },
  resolve(items) {
    return items[Math.floor(Math.random() * items.length)] ?? "";
  },
};

const pickHandler: MacroHandler = {
  match(inner) {
    if (!inner.startsWith("pick::")) return null;
    const items = inner.slice(6).split("::");
    return items.length >= 1 ? items : null;
  },
  resolve(items, ctx) {
    // Stable hash: same macroIndex + same turnCount = same pick
    const turnCount = ctx.state.turnCount ?? 0;
    const hash = ((ctx.macroIndex * 2654435761 + turnCount * 40503) >>> 0);
    const index = hash % items.length;
    return items[index] ?? "";
  },
};

const rollHandler: MacroHandler = {
  match(inner) {
    if (!inner.startsWith("roll::")) return null;
    // NdS or NdS+M or NdS-M
    const expr = inner.slice(6).trim();
    const m = expr.match(/^(\d+)d(\d+)([+-]\d+)?$/i);
    if (!m) return null;
    return [m[1]!, m[2]!, m[3] ?? ""];
  },
  resolve([countStr, sidesStr, modStr]) {
    const count = parseInt(countStr!, 10);
    const sides = parseInt(sidesStr!, 10);
    const mod = modStr ? parseInt(modStr, 10) : 0;
    let total = mod;
    for (let i = 0; i < count; i++) {
      total += Math.floor(Math.random() * sides) + 1;
    }
    return String(total);
  },
};

const timeHandler: MacroHandler = {
  match(inner) {
    return inner === "time" ? [] : null;
  },
  resolve() {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  },
};

const dateHandler: MacroHandler = {
  match(inner) {
    return inner === "date" ? [] : null;
  },
  resolve() {
    return new Date().toLocaleDateString();
  },
};

const weekdayHandler: MacroHandler = {
  match(inner) {
    return inner === "weekday" ? [] : null;
  },
  resolve() {
    return new Date().toLocaleDateString("en-US", { weekday: "long" });
  },
};

const isodateHandler: MacroHandler = {
  match(inner) {
    return inner === "isodate" ? [] : null;
  },
  resolve() {
    return new Date().toISOString().slice(0, 10);
  },
};

const isotimeHandler: MacroHandler = {
  match(inner) {
    return inner === "isotime" ? [] : null;
  },
  resolve() {
    return new Date().toISOString().slice(11, 19);
  },
};

const idleHandler: MacroHandler = {
  match(inner) {
    return inner === "idle" ? [] : null;
  },
  resolve(_g, ctx) {
    const lastAt = ctx.state.metadata?.lastUserMessageAt as string | undefined;
    if (!lastAt) return "unknown";
    const diffMs = Date.now() - new Date(lastAt).getTime();
    if (diffMs < 0 || isNaN(diffMs)) return "just now";
    const seconds = Math.floor(diffMs / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return minutes === 1 ? "1 minute" : `${minutes} minutes`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return hours === 1 ? "1 hour" : `${hours} hours`;
    const days = Math.floor(hours / 24);
    return days === 1 ? "1 day" : `${days} days`;
  },
};

const lastMessageHandler: MacroHandler = {
  match(inner) {
    return inner === "lastMessage" ? [] : null;
  },
  resolve(_g, ctx) {
    return (ctx.state.metadata?.lastMessage as string) ?? "";
  },
};

const lastUserMessageHandler: MacroHandler = {
  match(inner) {
    return inner === "lastUserMessage" ? [] : null;
  },
  resolve(_g, ctx) {
    return (ctx.state.metadata?.lastUserMessage as string) ?? "";
  },
};

const lastCharMessageHandler: MacroHandler = {
  match(inner) {
    return inner === "lastCharMessage" ? [] : null;
  },
  resolve(_g, ctx) {
    return (ctx.state.metadata?.lastCharMessage as string) ?? "";
  },
};

const modelHandler: MacroHandler = {
  match(inner) {
    return inner === "model" ? [] : null;
  },
  resolve(_g, ctx) {
    return (ctx.state.metadata?.model as string) ?? "";
  },
};

// ── Handler registry (order matters — first match wins) ──

const HANDLERS: MacroHandler[] = [
  commentHandler,
  trimHandler,
  charHandler,
  userHandler,
  turnCountHandler,
  randomHandler,
  pickHandler,
  rollHandler,
  timeHandler,
  dateHandler,
  weekdayHandler,
  isodateHandler,
  isotimeHandler,
  idleHandler,
  lastMessageHandler,
  lastUserMessageHandler,
  lastCharMessageHandler,
  modelHandler,
];

// ── Main expansion function ──

const MACRO_RE = /\{\{((?:[^{}]|\{(?!\{)|\}(?!\}))*)\}\}/g;

/**
 * Expand all macros in a template string.
 * Handles {{char}}, {{user}}, {{random::...}}, {{pick::...}}, {{roll::NdS}},
 * time/date macros, chat context macros, {{trim}}, {{// comments}}, and
 * falls back to variable lookup for simple identifiers.
 */
export function expandMacros(
  template: string,
  world: WorldDefinition,
  state: GameState
): string {
  const charEntry = world.entries.find((e) => e.role === "character" && e.enabled);
  const charName = charEntry?.name ?? "Assistant";
  const userName = world.settings?.playerName || "User";

  let macroIndex = 0;

  const result = template.replace(MACRO_RE, (_match, inner: string) => {
    const currentIndex = macroIndex++;
    const ctx: MacroResolveContext = {
      charName,
      userName,
      world,
      state,
      macroIndex: currentIndex,
    };

    // Try each handler
    for (const handler of HANDLERS) {
      const groups = handler.match(inner);
      if (groups !== null) {
        return handler.resolve(groups, ctx);
      }
    }

    // Fallback: variable lookup for simple word identifiers
    if (/^\w+$/.test(inner)) {
      const value = state.variables[inner];
      if (value !== undefined) return String(value);
    }

    // Unknown macro — leave literal
    return `{{${inner}}}`;
  });

  return applyTrim(result);
}

/** Post-process: collapse whitespace around trim markers */
function applyTrim(text: string): string {
  // Remove whitespace around trim markers
  return text.replace(/\s*\x00TRIM\x00\s*/g, "");
}
