import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { useEditorStore } from "@/stores/editor";
import { importSillyTavernCard } from "@yumina/engine";

export function OverviewSection() {
  const { worldDraft, setField, loadWorldDefinition } = useEditorStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [importResult, setImportResult] = useState<string | null>(null);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const world = importSillyTavernCard(json);
      loadWorldDefinition(world);
      const entryCount = world.entries.length;
      const varCount = world.variables.length;
      setImportResult(
        `Imported "${world.name}" — ${entryCount} entries, ${varCount} variables`
      );
    } catch {
      setImportResult("Failed to parse card file. Ensure it is valid JSON.");
    }

    // Reset file input so the same file can be re-imported
    if (fileRef.current) fileRef.current.value = "";
  };

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

      {/* ST Card Import */}
      <div className="border-t border-border pt-6">
        <h3 className="text-sm font-semibold text-foreground">
          Import SillyTavern Card
        </h3>
        <p className="mt-1 text-xs text-muted-foreground/50">
          Import a SillyTavern character card or world book (.json). This
          replaces the current world content.
        </p>
        <div className="mt-3 flex items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            <Upload className="h-3.5 w-3.5" />
            Choose File
          </button>
          {importResult && (
            <span className="text-xs text-muted-foreground/60">
              {importResult}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
