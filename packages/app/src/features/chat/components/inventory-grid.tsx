import { cn } from "@/lib/utils";
import type { ResolvedInventoryGrid } from "@yumina/engine";

export function InventoryGridRenderer({ data }: { data: ResolvedInventoryGrid }) {
  const slots = Array.from({ length: data.maxSlots }, (_, i) => data.items[i] ?? null);

  return (
    <div className="rounded-lg bg-accent p-3">
      <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/40">
        {data.name}
      </span>
      <div
        className="mt-2 grid gap-1"
        style={{ gridTemplateColumns: `repeat(${data.columns}, 1fr)` }}
      >
        {slots.map((item, i) => (
          <div
            key={i}
            className={cn(
              "flex items-center justify-center rounded-md border border-border/50 p-1 text-center",
              "h-8 text-[10px]",
              item ? "bg-background text-foreground/70" : "bg-background/30 text-muted-foreground/20"
            )}
            title={item ?? undefined}
          >
            {item ? (
              <span className="truncate">{item}</span>
            ) : (
              <span>&middot;</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
