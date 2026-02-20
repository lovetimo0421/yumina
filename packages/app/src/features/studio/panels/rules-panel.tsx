import type { IDockviewPanelProps } from "dockview-react";
import { RulesSection } from "@/features/editor/sections/rules";

export function RulesPanel(_props: IDockviewPanelProps) {
  return (
    <div className="h-full overflow-y-auto bg-background p-4">
      <div className="mx-auto max-w-2xl">
        <RulesSection />
      </div>
    </div>
  );
}
