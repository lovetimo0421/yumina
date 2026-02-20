import type { IDockviewPanelProps } from "dockview-react";
import { SettingsSection } from "@/features/editor/sections/settings";

export function SettingsPanel(_props: IDockviewPanelProps) {
  return (
    <div className="h-full overflow-y-auto bg-background p-4">
      <div className="mx-auto max-w-2xl">
        <SettingsSection />
      </div>
    </div>
  );
}
