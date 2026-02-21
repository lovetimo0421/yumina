import { useState } from "react";
import { cn } from "@/lib/utils";
import { useChatStore } from "@/stores/chat";
import type { ResolvedForm } from "@yumina/engine";

export function FormRenderer({ data }: { data: ResolvedForm }) {
  const { sendMessage } = useChatStore();
  const [submitted, setSubmitted] = useState(false);
  const [values, setValues] = useState<Record<string, string | number | boolean>>(() => {
    const initial: Record<string, string | number | boolean> = {};
    for (const field of data.fields) {
      if (field.defaultValue !== undefined) {
        initial[field.id] = field.defaultValue;
      } else if (field.type === "number") {
        initial[field.id] = 0;
      } else if (field.type === "toggle") {
        initial[field.id] = false;
      } else {
        initial[field.id] = "";
      }
    }
    return initial;
  });

  if (submitted && data.hideAfterSubmit) {
    return (
      <div className="rounded-lg bg-accent p-3 text-center">
        <p className="text-xs text-muted-foreground/50 italic">Form submitted</p>
      </div>
    );
  }

  const handleSubmit = () => {
    // Interpolate template
    let message = data.messageTemplate;
    if (!message) {
      // Auto-generate message from field values
      const lines = data.fields.map(
        (f) => `${f.label}: ${String(values[f.id] ?? "")}`
      );
      message = lines.join("\n");
    } else {
      for (const field of data.fields) {
        const val = String(values[field.id] ?? "");
        message = message.replace(
          new RegExp(`\\{\\{${field.id}\\}\\}`, "g"),
          val
        );
      }
    }
    sendMessage(message);
    setSubmitted(true);
  };

  const updateValue = (fieldId: string, value: string | number | boolean) => {
    setValues((prev) => ({ ...prev, [fieldId]: value }));
  };

  return (
    <div className="rounded-lg bg-accent p-3">
      <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/40">
        {data.name}
      </span>
      <div className="mt-2 space-y-2.5">
        {data.fields.map((field) => (
          <div key={field.id}>
            <label className="mb-1 block text-xs font-medium text-foreground/80">
              {field.label}
              {field.required && <span className="text-destructive ml-0.5">*</span>}
            </label>
            {field.type === "text" && (
              <input
                type="text"
                value={String(values[field.id] ?? "")}
                onChange={(e) => updateValue(field.id, e.target.value)}
                placeholder={field.placeholder}
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-1 focus:ring-ring"
              />
            )}
            {field.type === "number" && (
              <input
                type="number"
                value={Number(values[field.id] ?? 0)}
                onChange={(e) => updateValue(field.id, parseFloat(e.target.value) || 0)}
                placeholder={field.placeholder}
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-1 focus:ring-ring"
              />
            )}
            {field.type === "select" && (
              <select
                value={String(values[field.id] ?? "")}
                onChange={(e) => updateValue(field.id, e.target.value)}
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring [&>option]:bg-popover"
              >
                <option value="">Select...</option>
                {(field.options ?? []).map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            )}
            {field.type === "textarea" && (
              <textarea
                value={String(values[field.id] ?? "")}
                onChange={(e) => updateValue(field.id, e.target.value)}
                placeholder={field.placeholder}
                rows={3}
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-1 focus:ring-ring resize-y"
              />
            )}
            {field.type === "toggle" && (
              <button
                onClick={() => updateValue(field.id, !values[field.id])}
                className={cn(
                  "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                  values[field.id]
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-muted-foreground border border-border"
                )}
              >
                {values[field.id] ? "Yes" : "No"}
              </button>
            )}
          </div>
        ))}

        <button
          onClick={handleSubmit}
          className="w-full rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {data.submitLabel}
        </button>
      </div>
    </div>
  );
}
