import type { Effect, Variable, AudioEffect, AudioTrack } from "../types/index.js";

export interface StructuredResponse {
  narrative: string;
  stateChanges?: Array<{
    variableId: string;
    operation: string;
    value: number | string | boolean;
  }>;
  choices?: string[];
  audioTriggers?: Array<{
    trackId: string;
    action: string;
    volume?: number;
    fadeDuration?: number;
  }>;
}

export interface StructuredParseResult {
  cleanText: string;
  effects: Effect[];
  choices: string[];
  audioEffects: AudioEffect[];
}

const VALID_OPERATIONS = new Set([
  "set",
  "add",
  "subtract",
  "multiply",
  "toggle",
  "append",
]);

const VALID_AUDIO_ACTIONS = new Set(["play", "stop", "crossfade", "volume"]);

/**
 * Parses JSON structured output from LLMs.
 * Expected format: { narrative: string, stateChanges?: [...], choices?: [...], audioTriggers?: [...] }
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
      return { cleanText: jsonString, effects: [], choices: [], audioEffects: [] };
    }

    if (!parsed || typeof parsed.narrative !== "string") {
      return { cleanText: jsonString, effects: [], choices: [], audioEffects: [] };
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

    const audioEffects: AudioEffect[] = [];

    if (Array.isArray(parsed.audioTriggers)) {
      for (const trigger of parsed.audioTriggers) {
        if (
          typeof trigger.trackId === "string" &&
          typeof trigger.action === "string" &&
          VALID_AUDIO_ACTIONS.has(trigger.action)
        ) {
          const effect: AudioEffect = {
            trackId: trigger.trackId,
            action: trigger.action as AudioEffect["action"],
          };
          if (trigger.volume !== undefined) effect.volume = trigger.volume;
          if (trigger.fadeDuration !== undefined) effect.fadeDuration = trigger.fadeDuration;
          audioEffects.push(effect);
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
      audioEffects,
    };
  }

  /**
   * Build a JSON Schema describing the expected response format.
   * Enumerates the actual variable IDs and valid operations so the model
   * knows exactly what it can mutate.
   */
  buildResponseSchema(variables: Variable[], audioTracks?: AudioTrack[]): object {
    const variableIds = variables.map((v) => v.id);

    const schema: Record<string, unknown> = {
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

    // Add audioTriggers to schema if tracks are defined
    if (audioTracks && audioTracks.length > 0) {
      const trackIds = audioTracks.map((t) => t.id);
      (schema.properties as Record<string, unknown>).audioTriggers = {
        type: "array",
        description:
          "Audio triggers to play/stop background music or sound effects.",
        items: {
          type: "object",
          properties: {
            trackId: {
              type: "string",
              enum: trackIds,
              description: "The ID of the audio track",
            },
            action: {
              type: "string",
              enum: [...VALID_AUDIO_ACTIONS],
              description: "play (start track), stop (end track), crossfade (transition), volume (adjust)",
            },
            volume: {
              type: "number",
              description: "Volume level 0-1 (for volume/crossfade actions)",
            },
            fadeDuration: {
              type: "number",
              description: "Fade duration in seconds",
            },
          },
          required: ["trackId", "action"],
        },
      };
    }

    return schema;
  }
}
