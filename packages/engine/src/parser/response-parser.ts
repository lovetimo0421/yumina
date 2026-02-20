import type { Effect } from "../types/index.js";

export interface ParseResult {
  cleanText: string;
  effects: Effect[];
}

/**
 * Extracts state change directives from LLM output.
 * Format: [variableId: operation value]
 * Examples: [health: -10], [gold: +50], [location: set "forest"], [hasKey: toggle]
 */
export class ResponseParser {
  private pattern: RegExp;

  constructor(pattern?: RegExp) {
    // Match [variableId: operation] patterns
    this.pattern =
      pattern ?? /\[(\w+):\s*(set|add|subtract|multiply|toggle|append|\+|-|\*)?\s*("(?:[^"\\]|\\.)*"|[\w.-]+)?\]/g;
  }

  parse(responseText: string): ParseResult {
    const effects: Effect[] = [];
    const cleanText = responseText.replace(this.pattern, (_match, variableId: string, op?: string, rawValue?: string) => {
      const effect = this.parseDirective(variableId, op, rawValue);
      if (effect) effects.push(effect);
      return "";
    }).replace(/\s{2,}/g, " ").trim();

    return { cleanText, effects };
  }

  private parseDirective(
    variableId: string,
    op?: string,
    rawValue?: string
  ): Effect | null {
    // [hasKey: toggle] — no value needed
    if (op === "toggle") {
      return { variableId, operation: "toggle", value: true };
    }

    // [health: +10] shorthand
    if (op === "+" && rawValue) {
      const num = Number(rawValue);
      if (!isNaN(num)) {
        return { variableId, operation: "add", value: num };
      }
    }

    // [health: -10] shorthand
    if (op === "-" && rawValue) {
      const num = Number(rawValue);
      if (!isNaN(num)) {
        return { variableId, operation: "subtract", value: num };
      }
    }

    // [damage: *2] shorthand
    if (op === "*" && rawValue) {
      const num = Number(rawValue);
      if (!isNaN(num)) {
        return { variableId, operation: "multiply", value: num };
      }
    }

    // Explicit operations: set, add, subtract, multiply, append
    if (op && rawValue) {
      const operation = op as Effect["operation"];
      const value = this.parseValue(rawValue);
      return { variableId, operation, value };
    }

    // [health: 50] — implicit set with a number
    if (!op && rawValue) {
      const value = this.parseValue(rawValue);
      return { variableId, operation: "set", value };
    }

    // Shorthand: [health: +10] where op is the rawValue (no explicit operation word)
    if (op && !rawValue) {
      const num = Number(op);
      if (!isNaN(num)) {
        return { variableId, operation: "set", value: num };
      }
    }

    return null;
  }

  private parseValue(raw: string): number | string | boolean {
    // Quoted string
    if (raw.startsWith('"') && raw.endsWith('"')) {
      return raw.slice(1, -1).replace(/\\"/g, '"');
    }

    // Boolean
    if (raw === "true") return true;
    if (raw === "false") return false;

    // Number
    const num = Number(raw);
    if (!isNaN(num)) return num;

    // Fall back to string
    return raw;
  }
}
