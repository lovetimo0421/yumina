import { useMemo } from "react";
import type { IDockviewPanelProps } from "dockview-react";
import { useEditorStore } from "@/stores/editor";
import { CustomComponentRenderer } from "../lib/custom-component-renderer";
import { renderMessage } from "@/lib/markdown";
import { MessageSquare, Monitor, Smartphone } from "lucide-react";

export function CanvasPanel(_props: IDockviewPanelProps) {
  const { worldDraft } = useEditorStore();
  const uiMode = worldDraft.settings.uiMode ?? "chat";

  // Find greeting entry content
  const greetingEntry = worldDraft.entries.find(
    (e) => e.role === "greeting" && e.enabled
  );
  const greetingText = greetingEntry?.content ?? "";

  // Build preview variables from defaults
  const previewVars = useMemo(
    () =>
      Object.fromEntries(
        worldDraft.variables.map((v) => [v.id, v.defaultValue])
      ),
    [worldDraft.variables]
  );

  if (uiMode === "per-reply") {
    return (
      <div className="flex h-full items-center justify-center bg-muted/30 p-6">
        <PhoneMockup>
          {greetingText ? (
            <div
              className="text-sm leading-relaxed text-zinc-200"
              dangerouslySetInnerHTML={{
                __html: renderMessage(greetingText, worldDraft.displayTransforms),
              }}
            />
          ) : (
            <EmptyState icon={<Smartphone className="h-6 w-6" />} text="Add a greeting entry to preview the first message with display transforms." />
          )}
        </PhoneMockup>
      </div>
    );
  }

  if (uiMode === "persistent") {
    const visibleCustom = worldDraft.customComponents
      .filter((cc) => cc.visible)
      .sort((a, b) => a.order - b.order);

    return (
      <div className="flex h-full items-center justify-center bg-muted/30 p-6">
        <PhoneMockup>
          {visibleCustom.length > 0 ? (
            visibleCustom.map((cc) => (
              <CustomComponentRenderer
                key={cc.id}
                code={cc.tsxCode}
                variables={previewVars}
                worldName={worldDraft.name}
              />
            ))
          ) : (
            <EmptyState icon={<Monitor className="h-6 w-6" />} text="Add a custom component for the persistent game UI." />
          )}
        </PhoneMockup>
      </div>
    );
  }

  // Chat mode: simple greeting preview
  return (
    <div className="flex h-full items-center justify-center bg-muted/30 p-6">
      <PhoneMockup>
        {greetingText ? (
          <div className="space-y-3">
            <p className="text-xs font-medium text-primary">Narrator</p>
            <div
              className="text-sm leading-relaxed text-zinc-200"
              dangerouslySetInnerHTML={{
                __html: renderMessage(greetingText),
              }}
            />
          </div>
        ) : (
          <EmptyState icon={<MessageSquare className="h-6 w-6" />} text="Add a greeting entry to preview the opening message." />
        )}
      </PhoneMockup>
    </div>
  );
}

function PhoneMockup({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex w-full max-w-sm flex-col overflow-hidden rounded-2xl border-2 border-zinc-700 bg-zinc-950 shadow-2xl">
      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-1.5 text-[10px] text-zinc-500">
        <span>9:41</span>
        <div className="flex items-center gap-1">
          <span>Yumina</span>
        </div>
      </div>
      {/* Content */}
      <div className="max-h-[500px] flex-1 overflow-y-auto p-4">
        {children}
      </div>
      {/* Home indicator */}
      <div className="flex justify-center pb-2 pt-1">
        <div className="h-1 w-24 rounded-full bg-zinc-700" />
      </div>
    </div>
  );
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-zinc-500">
      {icon}
      <p className="text-xs">{text}</p>
    </div>
  );
}
