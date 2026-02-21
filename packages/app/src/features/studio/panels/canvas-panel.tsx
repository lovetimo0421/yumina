import { useMemo, useState } from "react";
import type { IDockviewPanelProps } from "dockview-react";
import { useEditorStore } from "@/stores/editor";
import { CustomComponentRenderer } from "../lib/custom-component-renderer";
import { renderMessage } from "@/lib/markdown";
import { Monitor, Tablet, Smartphone, Layers } from "lucide-react";

type DeviceMode = "desktop" | "tablet" | "mobile";

const DEVICE_CONFIG = {
  desktop: { maxWidth: "100%", label: "Desktop", icon: Monitor },
  tablet: { maxWidth: "768px", label: "Tablet", icon: Tablet },
  mobile: { maxWidth: "375px", label: "Mobile", icon: Smartphone },
} as const;

export function CanvasPanel(_props: IDockviewPanelProps) {
  const { worldDraft } = useEditorStore();
  const [device, setDevice] = useState<DeviceMode>("desktop");

  // Find greeting entry content
  const greetingEntry = worldDraft.entries.find(
    (e) => e.role === "greeting" && e.enabled
  );
  const greetingText = greetingEntry?.content ?? "";

  // Get visible custom components
  const visibleCustom = useMemo(
    () =>
      worldDraft.customComponents
        .filter((cc) => cc.visible)
        .sort((a, b) => a.order - b.order),
    [worldDraft.customComponents]
  );

  // Build preview variables from defaults
  const previewVars = useMemo(
    () =>
      Object.fromEntries(
        worldDraft.variables.map((v) => [v.id, v.defaultValue])
      ),
    [worldDraft.variables]
  );

  const hasCustomComponents = visibleCustom.length > 0;
  const hasGreeting = greetingText.length > 0;
  const hasDisplayTransforms = worldDraft.displayTransforms.length > 0;
  const isEmpty = !hasCustomComponents && !hasGreeting;

  const config = DEVICE_CONFIG[device];

  return (
    <div className="flex h-full flex-col bg-muted/30">
      {/* Device switcher toolbar */}
      <div className="flex shrink-0 items-center justify-center gap-1 border-b border-border bg-background px-4 py-2">
        {(Object.entries(DEVICE_CONFIG) as [DeviceMode, typeof config][]).map(
          ([mode, cfg]) => {
            const Icon = cfg.icon;
            return (
              <button
                key={mode}
                onClick={() => setDevice(mode)}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  device === mode
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {cfg.label}
              </button>
            );
          }
        )}
      </div>

      {/* Preview area */}
      <div className="flex flex-1 items-start justify-center overflow-y-auto p-6">
        <div
          className="w-full"
          style={{ maxWidth: config.maxWidth }}
        >
          {device === "desktop" ? (
            <DesktopFrame>{isEmpty ? <EmptyState /> : <CombinedPreview visibleCustom={visibleCustom} previewVars={previewVars} worldName={worldDraft.name} greetingText={greetingText} hasDisplayTransforms={hasDisplayTransforms} displayTransforms={worldDraft.displayTransforms} />}</DesktopFrame>
          ) : (
            <DeviceFrame>
              {isEmpty ? <EmptyState /> : <CombinedPreview visibleCustom={visibleCustom} previewVars={previewVars} worldName={worldDraft.name} greetingText={greetingText} hasDisplayTransforms={hasDisplayTransforms} displayTransforms={worldDraft.displayTransforms} />}
            </DeviceFrame>
          )}
        </div>
      </div>
    </div>
  );
}

function CombinedPreview({
  visibleCustom,
  previewVars,
  worldName,
  greetingText,
  hasDisplayTransforms,
  displayTransforms,
}: {
  visibleCustom: { id: string; tsxCode: string; name: string }[];
  previewVars: Record<string, number | string | boolean>;
  worldName: string;
  greetingText: string;
  hasDisplayTransforms: boolean;
  displayTransforms: { id: string; name: string; pattern: string; replacement: string; flags?: string; order: number; enabled: boolean }[];
}) {
  return (
    <div className="space-y-4">
      {/* Custom components */}
      {visibleCustom.length > 0 && (
        <div className="space-y-2">
          {visibleCustom.map((cc) => (
            <CustomComponentRenderer
              key={cc.id}
              code={cc.tsxCode}
              variables={previewVars}
              worldName={worldName}
            />
          ))}
        </div>
      )}

      {/* Greeting with display transforms */}
      {greetingText && (
        <div className="space-y-2">
          {visibleCustom.length > 0 && (
            <div className="border-t border-zinc-700/50 pt-3" />
          )}
          <div
            className="text-sm leading-relaxed text-zinc-200"
            dangerouslySetInnerHTML={{
              __html: hasDisplayTransforms
                ? renderMessage(greetingText, displayTransforms)
                : renderMessage(greetingText),
            }}
          />
        </div>
      )}
    </div>
  );
}

/** Browser-style desktop frame */
function DesktopFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex w-full flex-col overflow-hidden rounded-lg border border-zinc-700 bg-zinc-950 shadow-2xl">
      {/* Title bar */}
      <div className="flex items-center gap-2 border-b border-zinc-800 bg-zinc-900 px-3 py-2">
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
          <div className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
          <div className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
        </div>
        {/* Address bar */}
        <div className="ml-2 flex-1 rounded bg-zinc-800 px-3 py-1">
          <span className="text-[11px] text-zinc-500">yumina.app/play/...</span>
        </div>
      </div>
      {/* Content */}
      <div className="max-h-[600px] flex-1 overflow-y-auto p-4">
        {children}
      </div>
    </div>
  );
}

/** Phone/tablet device frame */
function DeviceFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex w-full flex-col overflow-hidden rounded-2xl border-2 border-zinc-700 bg-zinc-950 shadow-2xl">
      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-1.5 text-[10px] text-zinc-500">
        <span>9:41</span>
        <span>Yumina</span>
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

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-zinc-500">
      <Layers className="h-6 w-6" />
      <p className="text-xs">Add a greeting entry or custom component to preview your world.</p>
    </div>
  );
}
