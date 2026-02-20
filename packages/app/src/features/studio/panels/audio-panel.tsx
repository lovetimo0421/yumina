import type { IDockviewPanelProps } from "dockview-react";
import { AudioSection } from "@/features/editor/sections/audio";

export function AudioPanel(_props: IDockviewPanelProps) {
  return (
    <div className="h-full overflow-y-auto bg-background p-4">
      <div className="mx-auto max-w-2xl">
        <AudioSection />
      </div>
    </div>
  );
}
