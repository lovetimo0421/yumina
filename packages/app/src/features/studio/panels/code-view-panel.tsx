import { useState, useMemo } from "react";
import type { IDockviewPanelProps } from "dockview-react";
import { Check, AlertCircle, FileCode, Plus } from "lucide-react";
import { useEditorStore } from "@/stores/editor";
import { compileTSX } from "../lib/tsx-compiler";

export function CodeViewPanel(_props: IDockviewPanelProps) {
  const { worldDraft, updateCustomComponent, addCustomComponent } =
    useEditorStore();
  const [selectedId, setSelectedId] = useState<string | null>(
    worldDraft.customComponents[0]?.id ?? null
  );

  const selected = worldDraft.customComponents.find((c) => c.id === selectedId);

  const compileStatus = useMemo(() => {
    if (!selected) return null;
    const result = compileTSX(selected.tsxCode);
    return result.error ? { ok: false, error: result.error } : { ok: true, error: null };
  }, [selected?.tsxCode]);

  return (
    <div className="flex h-full bg-background">
      {/* File list sidebar */}
      <div className="w-44 shrink-0 border-r border-border overflow-y-auto">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <span className="text-xs font-medium text-muted-foreground">
            Components
          </span>
          <button
            onClick={() => {
              addCustomComponent();
              // Select the newly created one
              setTimeout(() => {
                const ccs = useEditorStore.getState().worldDraft.customComponents;
                const newest = ccs[ccs.length - 1];
                if (newest) setSelectedId(newest.id);
              }, 0);
            }}
            className="hover-surface rounded p-0.5 text-muted-foreground"
            title="Add Component"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        {worldDraft.customComponents.length === 0 && (
          <div className="p-3 text-xs text-muted-foreground/50">
            No custom components yet
          </div>
        )}

        {worldDraft.customComponents.map((cc) => (
          <button
            key={cc.id}
            onClick={() => setSelectedId(cc.id)}
            className={`flex w-full items-center gap-2 px-3 py-2 text-xs transition-colors ${
              selectedId === cc.id
                ? "active-surface text-foreground"
                : "text-muted-foreground hover-surface"
            }`}
          >
            <FileCode className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{cc.name}</span>
          </button>
        ))}
      </div>

      {/* Editor */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {selected ? (
          <>
            {/* Toolbar */}
            <div className="flex items-center gap-2 border-b border-border px-3 py-2">
              <input
                type="text"
                value={selected.name}
                onChange={(e) =>
                  updateCustomComponent(selected.id, { name: e.target.value })
                }
                className="flex-1 bg-transparent text-xs font-medium text-foreground focus:outline-none"
              />
              {compileStatus && (
                <span
                  className={`flex items-center gap-1 text-[10px] ${
                    compileStatus.ok
                      ? "text-green-400"
                      : "text-destructive"
                  }`}
                >
                  {compileStatus.ok ? (
                    <>
                      <Check className="h-3 w-3" />
                      OK
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-3 w-3" />
                      Error
                    </>
                  )}
                </span>
              )}
            </div>

            {/* Code textarea */}
            <textarea
              value={selected.tsxCode}
              onChange={(e) =>
                updateCustomComponent(selected.id, { tsxCode: e.target.value })
              }
              spellCheck={false}
              className="flex-1 resize-none bg-muted/30 p-4 font-mono text-xs text-foreground focus:outline-none"
              style={{ tabSize: 2 }}
            />

            {/* Error display */}
            {compileStatus && !compileStatus.ok && (
              <div className="border-t border-destructive/30 bg-destructive/5 px-3 py-2">
                <p className="text-xs text-destructive font-mono">
                  {compileStatus.error}
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground/50">
            <p className="text-xs">Select a component or create one</p>
          </div>
        )}
      </div>
    </div>
  );
}
