import { cn } from "@/lib/utils";
import type { ResolvedStatBar } from "@yumina/engine";

export function StatBarRenderer({ data }: { data: ResolvedStatBar }) {
  return (
    <div className="rounded-lg bg-accent p-3">
      {data.showLabel && (
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-foreground/80">{data.name}</span>
          {data.showValue && (
            <span className="font-mono text-muted-foreground/60">
              {data.value}
              {data.max !== 100 && ` / ${data.max}`}
            </span>
          )}
        </div>
      )}
      <div
        className={cn("h-1.5 overflow-hidden rounded-full bg-background", data.showLabel && "mt-2")}
      >
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${data.percentage}%`,
            backgroundColor: data.color || "hsl(var(--primary) / 0.6)",
          }}
        />
      </div>
    </div>
  );
}
