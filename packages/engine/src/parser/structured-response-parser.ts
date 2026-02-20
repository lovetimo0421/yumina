import type { Effect, Variable } from "../types/index.js";

export interface StructuredResponse {
  narrative: string;
  stateChanges?: Array<{
    variableId: string;
    operation: string;
    value: number | string | boolean;
  }>;
  choices?: string[];
}

export interface StructuredParseResult {
  cleanText: string;
  effects: Effect[];
  choices: string[];
}

const VALID_OPERATIONS = new Set([
  "set",
  "add",
  "subtract",
  "multiply",
  "toggle",
  "append",
]);

/**
 * Parses JSON structured output from LLMs.
 * Expected format: { narrative: string, stateChanges?: [...], choices?: [...] }
 */
export class StructuredResponseParser {
  /**
   * Parse a JSON string response into effects and clean narrative text.
   * If JSON parsing fails, returns the raw text with no effects (caller should fall back to regex).
   */
  parse(jsonString: string): StructuredParseResult {
    let parsed: StructuredResponse;

    try {
      parsed = JSON.parse(jsonString);
    } catch {
      // JSON parse failed — return raw text so caller can fall back to regex
      return { cleanText: jsonString, effects: [], choices: [] };
    }

    if (!parsed || typeof parsed.narrative !== "string") {
      return { cleanText: jsonString, effects: [], choices: [] };
    }

    const effects: Effect[] = [];

    if (Array.isArray(parsed.stateChanges)) {
      for (const change of parsed.stateChanges) {
        if (
          typeof change.variableId === "string" &&
          typeof change.operation === "string" &&
          VALID_OPERATIONS.has(change.operation) &&
          change.value !== undefined
        ) {
          effects.push({
            variableId: change.variableId,
            operation: change.operation as Effect["operation"],
            value: change.value,
          });
        }
      }
    }

    const choices = Array.isArray(parsed.choices)
      ? parsed.choices.filter((c): c is string => typeof c === "string")
      : [];

    return {
      cleanText: parsed.narrative.trim(),
      effects,
      choices,
    };
  }

  /**
   * Build a JSON Schema describing the expected response format.
   * Enumerates the actual variable IDs and valid operations so the model
   * knows exactly what it can mutate.
   */
  buildResponseSchema(variables: Variable[]): object {
    const variableIds = variables.map((v) => v.id);

    return {
      type: "object",
      properties: {
        narrative: {
          type: "string",
          description:
            "Your in-character response text. This is what the player reads.",
        },
        stateChanges: {
          type: "array",
          description:
            "State changes to apply to game variables. Only include changes that happened in this response.",
          items: {
            type: "object",
            properties: {
              variableId: {
                type: "string",
                enum: variableIds.length > 0 ? variableIds : undefined,
                description: "The ID of the variable to change",
              },
              operation: {
                type: "string",
                enum: [...VALID_OPERATIONS],
                description:
                  "The operation: set (replace), add (number), subtract (number), multiply (number), toggle (boolean), append (string)",
              },
              value: {
                description: "The value for the operation",
              },
            },
            required: ["variableId", "operation", "value"],
          },
        },
        choices: {
          type: "array",
          description:
            "Optional choices to present to the player. 2-4 short options.",
          items: { type: "string" },
        },
      },
      required: ["narrative"],
    };
  }
}
