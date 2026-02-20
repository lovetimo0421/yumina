import { useEditorStore } from "@/stores/editor";

export function OverviewSection() {
  const { worldDraft, setField } = useEditorStore();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Overview</h2>
        <p className="mt-1 text-sm text-muted-foreground/50">
          Basic information about your world
        </p>
      </div>

      <div className="space-y-4">
        {/* Name */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            World Name <span className="text-destructive">*</span>
          </label>
          <input
            type="text"
            value={worldDraft.name}
            onChange={(e) => setField("name", e.target.value)}
            placeholder="Enter world name..."
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Description */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Description
          </label>
          <textarea
            value={worldDraft.description}
            onChange={(e) => setField("description", e.target.value)}
            placeholder="Describe your world..."
            rows={4}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
          <p className="mt-1 text-xs text-muted-foreground/40">
            Markdown supported
          </p>
        </div>

        {/* Author */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Author
          </label>
          <input
            type="text"
            value={worldDraft.author}
            onChange={(e) => setField("author", e.target.value)}
            placeholder="Your name..."
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Version */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Version
          </label>
          <input
            type="text"
            value={worldDraft.version}
            onChange={(e) => setField("version", e.target.value)}
            placeholder="1.0.0"
            className="w-48 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Thumbnail */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Thumbnail URL
          </label>
          <input
            type="text"
            value=""
            placeholder="https://example.com/image.png"
            disabled
            readOnly
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground/30 placeholder:text-muted-foreground/30 focus:outline-none disabled:opacity-50"
          />
          <p className="mt-1 text-xs text-muted-foreground/40">
            Thumbnail upload coming soon
          </p>
        </div>
      </div>
    </div>
  );
}
