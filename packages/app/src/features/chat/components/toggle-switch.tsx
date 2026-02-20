import { cn } from "@/lib/utils";
import type { ResolvedToggleSwitch } from "@yumina/engine";

export function ToggleSwitchRenderer({ data }: { data: ResolvedToggleSwitch }) {
  const label = data.value ? data.onLabel : data.offLabel;

  return (
    <div className="flex items-center justify-between rounded-lg bg-accent p-3">
      <span className="text-xs font-medium text-foreground/80">{data.name}</span>
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-muted-foreground/50">{label}</span>
        <div
          className={cn(
            "h-2.5 w-2.5 rounded-full transition-colors duration-300",
            data.value ? "bg-primary" : "bg-muted-foreground/20"
          )}
          style={data.value && data.color ? { backgroundColor: data.color } : undefined}
        />
      </div>
    </div>
  );
}
