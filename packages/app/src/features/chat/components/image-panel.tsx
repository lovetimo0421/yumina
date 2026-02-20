import { cn } from "@/lib/utils";
import type { ResolvedImagePanel } from "@yumina/engine";

const aspectRatioMap = {
  square: "aspect-square",
  portrait: "aspect-[3/4]",
  landscape: "aspect-video",
  wide: "aspect-[21/9]",
} as const;

export function ImagePanelRenderer({ data }: { data: ResolvedImagePanel }) {
  const src = data.imageUrl || data.fallbackUrl;

  if (!src) {
    return (
      <div className="rounded-lg bg-accent p-3">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/40">
          {data.name}
        </span>
        <div
          className={cn(
            "mt-2 flex items-center justify-center rounded-md bg-background text-muted-foreground/30",
            aspectRatioMap[data.aspectRatio]
          )}
        >
          <span className="text-xs">No image</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-accent p-3">
      <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/40">
        {data.name}
      </span>
      <div className={cn("mt-2 overflow-hidden rounded-md", aspectRatioMap[data.aspectRatio])}>
        <img
          src={src}
          alt={data.name}
          className="h-full w-full object-cover"
          onError={(e) => {
            if (data.fallbackUrl && e.currentTarget.src !== data.fallbackUrl) {
              e.currentTarget.src = data.fallbackUrl;
            }
          }}
        />
      </div>
    </div>
  );
}
