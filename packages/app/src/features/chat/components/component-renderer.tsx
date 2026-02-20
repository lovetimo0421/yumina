import type { ResolvedComponent } from "@yumina/engine";
import { StatBarRenderer } from "./stat-bar";
import { TextDisplayRenderer } from "./text-display";
import { ChoiceListRenderer } from "./choice-list";
import { ImagePanelRenderer } from "./image-panel";
import { InventoryGridRenderer } from "./inventory-grid";
import { ToggleSwitchRenderer } from "./toggle-switch";

export function ComponentRenderer({ component }: { component: ResolvedComponent }) {
  switch (component.type) {
    case "stat-bar":
      return <StatBarRenderer data={component} />;
    case "text-display":
      return <TextDisplayRenderer data={component} />;
    case "choice-list":
      return <ChoiceListRenderer data={component} />;
    case "image-panel":
      return <ImagePanelRenderer data={component} />;
    case "inventory-grid":
      return <InventoryGridRenderer data={component} />;
    case "toggle-switch":
      return <ToggleSwitchRenderer data={component} />;
    case "error":
      return (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
          <span className="text-xs font-medium text-destructive/70">{component.name}</span>
          <p className="mt-0.5 text-[11px] text-destructive/50">{component.message}</p>
        </div>
      );
  }
}
