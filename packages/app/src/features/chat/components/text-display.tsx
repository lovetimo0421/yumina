import { cn } from "@/lib/utils";
import type { ResolvedTextDisplay } from "@yumina/engine";

const fontSizeMap = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
} as const;

export function TextDisplayRenderer({ data }: { data: ResolvedTextDisplay }) {
  return (
    <div className="rounded-lg bg-accent p-3">
      <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/40">
        {data.name}
      </span>
      <p className={cn("mt-0.5 text-foreground/80", fontSizeMap[data.fontSize])}>
        {data.text}
      </p>
    </div>
  );
}
