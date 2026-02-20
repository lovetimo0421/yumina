import { useEditorStore } from "@/stores/editor";
import type { StudioAction } from "@/stores/studio";
import type { WorldEntry } from "@yumina/engine";

/**
 * Applies structured studio actions from the AI to the editor store.
 * Returns a human-readable summary of applied actions.
 */
export function applyStudioActions(actions: StudioAction[]): string {
  const store = useEditorStore.getState();
  const summaries: string[] = [];

  for (const action of actions) {
    try {
      switch (action.type) {
        case "addVariable": {
          const d = action.data as Record<string, unknown>;
          store.addVariable();
          const vars = useEditorStore.getState().worldDraft.variables;
          const newest = vars[vars.length - 1];
          if (newest) {
            store.updateVariable(newest.id, {
              id: (d.id as string) ?? newest.id,
              name: (d.name as string) ?? "New Variable",
              type: (d.type as "number" | "string" | "boolean") ?? "number",
              defaultValue: (d.defaultValue as number | string | boolean) ?? 0,
              description: (d.description as string) ?? "",
              min: d.min as number | undefined,
              max: d.max as number | undefined,
            });
          }
          summaries.push(`Added variable "${d.name}"`);
          break;
        }
        case "updateVariable": {
          const d = action.data as Record<string, unknown>;
          if (d.id) store.updateVariable(d.id as string, d);
          summaries.push(`Updated variable "${d.id}"`);
          break;
        }
        case "removeVariable": {
          const d = action.data as Record<string, unknown>;
          if (d.id) store.removeVariable(d.id as string);
          summaries.push(`Removed variable "${d.id}"`);
          break;
        }
        case "addEntry": {
          const d = action.data as Record<string, unknown>;
          const role = (d.role as WorldEntry["role"]) ?? "custom";
          const position = (d.position as WorldEntry["position"]) ?? "after_char";
          store.addEntry(role, position);
          const entries = useEditorStore.getState().worldDraft.entries;
          const newest = entries[entries.length - 1];
          if (newest) {
            store.updateEntry(newest.id, {
              id: (d.id as string) ?? newest.id,
              name: (d.name as string) ?? "New Entry",
              content: (d.content as string) ?? "",
              role,
              position,
              depth: d.depth as number | undefined,
              insertionOrder: (d.insertionOrder as number) ?? newest.insertionOrder,
              alwaysSend: d.alwaysSend === true,
              keywords: (d.keywords as string[]) ?? [],
              priority: (d.priority as number) ?? 0,
              enabled: d.enabled !== false,
            });
          }
          summaries.push(`Added entry "${d.name}"`);
          break;
        }
        case "updateEntry": {
          const d = action.data as Record<string, unknown>;
          if (d.id) store.updateEntry(d.id as string, d);
          summaries.push(`Updated entry "${d.id}"`);
          break;
        }
        case "removeEntry": {
          const d = action.data as Record<string, unknown>;
          if (d.id) store.removeEntry(d.id as string);
          summaries.push(`Removed entry "${d.id}"`);
          break;
        }
        // Legacy action names — map to entry actions for backwards compat
        case "addCharacter": {
          const d = action.data as Record<string, unknown>;
          store.addEntry("character", "character");
          const entries = useEditorStore.getState().worldDraft.entries;
          const newest = entries[entries.length - 1];
          if (newest) {
            const content = `You are ${d.name ?? ""}. ${d.description ?? ""}${d.systemPrompt ? `\n\n${d.systemPrompt}` : ""}`;
            store.updateEntry(newest.id, {
              id: (d.id as string) ?? newest.id,
              name: (d.name as string) ?? "New Character",
              content,
              role: "character",
              position: "character",
              alwaysSend: true,
            });
          }
          summaries.push(`Added character "${d.name}" (as entry)`);
          break;
        }
        case "updateCharacter": {
          const d = action.data as Record<string, unknown>;
          if (d.id) store.updateEntry(d.id as string, d);
          summaries.push(`Updated character entry "${d.id}"`);
          break;
        }
        case "removeCharacter": {
          const d = action.data as Record<string, unknown>;
          if (d.id) store.removeEntry(d.id as string);
          summaries.push(`Removed character entry "${d.id}"`);
          break;
        }
        case "addLorebookEntry": {
          const d = action.data as Record<string, unknown>;
          const roleMap: Record<string, WorldEntry["role"]> = {
            character: "character",
            lore: "lore",
            plot: "plot",
            style: "style",
            custom: "custom",
          };
          const role = roleMap[(d.type as string) ?? "lore"] ?? "lore";
          const position = d.position === "before" ? "before_char" : "after_char";
          store.addEntry(role, position as WorldEntry["position"]);
          const entries = useEditorStore.getState().worldDraft.entries;
          const newest = entries[entries.length - 1];
          if (newest) {
            store.updateEntry(newest.id, {
              id: (d.id as string) ?? newest.id,
              name: (d.name as string) ?? "New Entry",
              content: (d.content as string) ?? "",
              role,
              position: position as WorldEntry["position"],
              keywords: (d.keywords as string[]) ?? [],
              priority: (d.priority as number) ?? 0,
              enabled: d.enabled !== false,
              alwaysSend: d.alwaysSend === true,
            });
          }
          summaries.push(`Added entry "${d.name}" (legacy lorebook)`);
          break;
        }
        case "updateLorebookEntry": {
          const d = action.data as Record<string, unknown>;
          if (d.id) store.updateEntry(d.id as string, d);
          summaries.push(`Updated entry "${d.id}" (legacy lorebook)`);
          break;
        }
        case "removeLorebookEntry": {
          const d = action.data as Record<string, unknown>;
          if (d.id) store.removeEntry(d.id as string);
          summaries.push(`Removed entry "${d.id}" (legacy lorebook)`);
          break;
        }
        case "addRule": {
          const d = action.data as Record<string, unknown>;
          store.addRule();
          const rules = useEditorStore.getState().worldDraft.rules;
          const newest = rules[rules.length - 1];
          if (newest) {
            store.updateRule(newest.id, {
              id: (d.id as string) ?? newest.id,
              name: (d.name as string) ?? "New Rule",
              description: d.description as string | undefined,
              conditions: d.conditions as [] ?? [],
              conditionLogic: (d.conditionLogic as "all" | "any") ?? "all",
              effects: d.effects as [] ?? [],
              priority: (d.priority as number) ?? 0,
            });
          }
          summaries.push(`Added rule "${d.name}"`);
          break;
        }
        case "updateRule": {
          const d = action.data as Record<string, unknown>;
          if (d.id) store.updateRule(d.id as string, d);
          summaries.push(`Updated rule "${d.id}"`);
          break;
        }
        case "removeRule": {
          const d = action.data as Record<string, unknown>;
          if (d.id) store.removeRule(d.id as string);
          summaries.push(`Removed rule "${d.id}"`);
          break;
        }
        case "addComponent": {
          const d = action.data as Record<string, unknown>;
          store.addComponent(d.type as "stat-bar" | undefined);
          const comps = useEditorStore.getState().worldDraft.components;
          const newest = comps[comps.length - 1];
          if (newest) {
            store.updateComponent(newest.id, {
              id: (d.id as string) ?? newest.id,
              name: (d.name as string) ?? "New Component",
              visible: d.visible !== false,
              config: (d.config ?? { variableId: "" }) as never,
            });
          }
          summaries.push(`Added component "${d.name}"`);
          break;
        }
        case "updateComponent": {
          const d = action.data as Record<string, unknown>;
          if (d.id) store.updateComponent(d.id as string, d);
          summaries.push(`Updated component "${d.id}"`);
          break;
        }
        case "removeComponent": {
          const d = action.data as Record<string, unknown>;
          if (d.id) store.removeComponent(d.id as string);
          summaries.push(`Removed component "${d.id}"`);
          break;
        }
        case "addAudioTrack": {
          const d = action.data as Record<string, unknown>;
          store.addAudioTrack();
          const tracks = useEditorStore.getState().worldDraft.audioTracks;
          const newest = tracks[tracks.length - 1];
          if (newest) {
            store.updateAudioTrack(newest.id, {
              id: (d.id as string) ?? newest.id,
              name: (d.name as string) ?? "New Track",
              type: (d.type as "bgm" | "sfx" | "ambient") ?? "bgm",
              url: (d.url as string) ?? "",
              loop: d.loop as boolean | undefined,
              volume: d.volume as number | undefined,
            });
          }
          summaries.push(`Added audio track "${d.name}"`);
          break;
        }
        case "updateAudioTrack": {
          const d = action.data as Record<string, unknown>;
          if (d.id) store.updateAudioTrack(d.id as string, d);
          summaries.push(`Updated audio track "${d.id}"`);
          break;
        }
        case "removeAudioTrack": {
          const d = action.data as Record<string, unknown>;
          if (d.id) store.removeAudioTrack(d.id as string);
          summaries.push(`Removed audio track "${d.id}"`);
          break;
        }
        case "addCustomComponent": {
          const d = action.data as Record<string, unknown>;
          store.addCustomComponent();
          const ccs = useEditorStore.getState().worldDraft.customComponents;
          const newest = ccs[ccs.length - 1];
          if (newest) {
            store.updateCustomComponent(newest.id, {
              id: (d.id as string) ?? newest.id,
              name: (d.name as string) ?? "Custom Component",
              tsxCode: (d.tsxCode as string) ?? "",
              description: (d.description as string) ?? "",
            });
          }
          summaries.push(`Added custom component "${d.name}"`);
          break;
        }
        case "updateCustomComponent": {
          const d = action.data as Record<string, unknown>;
          if (d.id) store.updateCustomComponent(d.id as string, d);
          summaries.push(`Updated custom component "${d.id}"`);
          break;
        }
        case "removeCustomComponent": {
          const d = action.data as Record<string, unknown>;
          if (d.id) store.removeCustomComponent(d.id as string);
          summaries.push(`Removed custom component "${d.id}"`);
          break;
        }
        case "updateSettings": {
          const d = action.data as Record<string, unknown>;
          for (const [key, value] of Object.entries(d)) {
            store.setSettings(
              key as keyof typeof store.worldDraft.settings,
              value as string | number | boolean
            );
          }
          summaries.push(`Updated settings`);
          break;
        }
        default:
          summaries.push(`Unknown action: ${action.type}`);
      }
    } catch (err) {
      summaries.push(
        `Failed: ${action.type} — ${err instanceof Error ? err.message : "unknown error"}`
      );
    }
  }

  return summaries.join(", ");
}
