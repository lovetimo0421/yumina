import { cn } from "@/lib/utils";
import { useChatStore } from "@/stores/chat";
import type { ResolvedChoiceList } from "@yumina/engine";

export function ChoiceListRenderer({ data }: { data: ResolvedChoiceList }) {
  const { pendingChoices, sendMessage } = useChatStore();

  if (pendingChoices.length === 0) {
    return (
      <div className="rounded-lg bg-accent p-3">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/40">
          {data.name}
        </span>
        <p className="mt-1 text-xs text-muted-foreground/50 italic">
          Waiting for choices...
        </p>
      </div>
    );
  }

  const choices = pendingChoices.slice(0, data.maxChoices);

  if (data.style === "list") {
    return (
      <div className="rounded-lg bg-accent p-3">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/40">
          {data.name}
        </span>
        <div className="mt-2 space-y-1">
          {choices.map((choice, i) => (
            <button
              key={i}
              onClick={() => sendMessage(choice)}
              className="block w-full rounded-md px-2 py-1.5 text-left text-xs text-foreground/80 transition-colors hover:bg-background"
            >
              {choice}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-accent p-3">
      <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/40">
        {data.name}
      </span>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {choices.map((choice, i) => (
          <button
            key={i}
            onClick={() => sendMessage(choice)}
            className={cn(
              "rounded-md bg-background px-2.5 py-1 text-xs font-medium text-foreground/80",
              "transition-colors hover:bg-primary/10 hover:text-primary"
            )}
          >
            {choice}
          </button>
        ))}
      </div>
    </div>
  );
}
