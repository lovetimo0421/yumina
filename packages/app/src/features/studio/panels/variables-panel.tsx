import type { IDockviewPanelProps } from "dockview-react";
import { VariablesSection } from "@/features/editor/sections/variables";

export function VariablesPanel(_props: IDockviewPanelProps) {
  return (
    <div className="h-full overflow-y-auto bg-background p-4">
      <div className="mx-auto max-w-2xl">
        <VariablesSection />
      </div>
    </div>
  );
}
