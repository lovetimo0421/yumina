import { useState, useEffect } from "react";
import { Plus, Trash2, CheckCircle, XCircle, Loader2, Key } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ApiKeyEntry {
  id: string;
  provider: string;
  label: string;
  createdAt: string;
}

const apiBase = import.meta.env.VITE_API_URL || "";

const PROVIDERS = [
  { value: "openrouter", label: "OpenRouter", placeholder: "sk-or-v1-...", helpUrl: "https://openrouter.ai/keys", helpLabel: "OpenRouter" },
  { value: "anthropic", label: "Anthropic", placeholder: "sk-ant-...", helpUrl: "https://console.anthropic.com/settings/keys", helpLabel: "Anthropic Console" },
  { value: "openai", label: "OpenAI", placeholder: "sk-...", helpUrl: "https://platform.openai.com/api-keys", helpLabel: "OpenAI Platform" },
  { value: "ollama", label: "Ollama (Local)", placeholder: "http://localhost:11434", helpUrl: "https://ollama.com", helpLabel: "Ollama" },
] as const;

const PROVIDER_COLORS: Record<string, string> = {
  openrouter: "bg-violet-500/15 text-violet-400",
  anthropic: "bg-orange-500/15 text-orange-400",
  openai: "bg-green-500/15 text-green-400",
  ollama: "bg-blue-500/15 text-blue-400",
};

export function ApiKeysSettings() {
  const [keys, setKeys] = useState<ApiKeyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newLabel, setNewLabel] = useState("Default");
  const [newProvider, setNewProvider] = useState("openrouter");
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [verifyResult, setVerifyResult] = useState<Record<string, boolean | null>>({});

  const selectedProvider = PROVIDERS.find((p) => p.value === newProvider) ?? PROVIDERS[0];
  const isOllama = newProvider === "ollama";

  const fetchKeys = async () => {
    try {
      const res = await fetch(`${apiBase}/api/keys`, { credentials: "include" });
      if (res.ok) {
        const { data } = await res.json();
        setKeys(data);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const keyValue = isOllama ? (newKey.trim() || "http://localhost:11434") : newKey.trim();
    if (!keyValue) return;
    setAdding(true);
    try {
      const res = await fetch(`${apiBase}/api/keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ key: keyValue, label: newLabel || "Default", provider: newProvider }),
      });
      if (res.ok) {
        setNewKey("");
        setNewLabel("Default");
        await fetchKeys();
      } else {
        toast.error("Failed to add API key");
      }
    } catch {
      toast.error("Failed to add API key");
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`${apiBase}/api/keys/${id}`, { method: "DELETE", credentials: "include" });
      if (res.ok) {
        setKeys((prev) => prev.filter((k) => k.id !== id));
      } else {
        toast.error("Failed to remove API key");
      }
    } catch {
      toast.error("Failed to remove API key");
    }
  };

  const handleVerify = async (id: string) => {
    setVerifyingId(id);
    setVerifyResult((prev) => ({ ...prev, [id]: null }));
    try {
      const res = await fetch(`${apiBase}/api/keys/${id}/verify`, { method: "POST", credentials: "include" });
      if (res.ok) {
        const { data } = await res.json();
        setVerifyResult((prev) => ({ ...prev, [id]: data.valid }));
      }
    } catch {
      setVerifyResult((prev) => ({ ...prev, [id]: false }));
    } finally {
      setVerifyingId(null);
    }
  };

  return (
    <Card className="rounded-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          API Keys
        </CardTitle>
        <CardDescription className="text-muted-foreground/50">
          Manage your LLM provider API keys. Keys are encrypted at rest.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleAdd} className="flex flex-col gap-3">
          <div className="flex gap-2">
            <select
              value={newProvider}
              onChange={(e) => {
                setNewProvider(e.target.value);
                setNewKey("");
              }}
              className="rounded-lg border border-border bg-background px-2 py-2 text-sm text-foreground"
            >
              {PROVIDERS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
            <Input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="Label" className="w-28" />
            <Input
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              placeholder={selectedProvider.placeholder}
              type={isOllama ? "text" : "password"}
              className="flex-1"
            />
            <Button type="submit" disabled={adding || (!isOllama && !newKey.trim())} size="icon">
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground/40">
            {isOllama ? (
              <>Run Ollama locally. Leave URL blank for default (localhost:11434).</>
            ) : (
              <>
                Get your API key from{" "}
                <a href={selectedProvider.helpUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                  {selectedProvider.helpLabel}
                </a>
              </>
            )}
          </p>
        </form>

        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/40" />
          </div>
        ) : keys.length === 0 ? (
          <p className="text-sm text-muted-foreground/40">No API keys saved.</p>
        ) : (
          <div className="space-y-2">
            {keys.map((key) => (
              <div key={key.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{key.label}</p>
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${PROVIDER_COLORS[key.provider] ?? "bg-accent text-muted-foreground"}`}>
                      {key.provider}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground/40">
                    {new Date(key.createdAt).toLocaleDateString()}
                  </p>
                </div>

                {verifyResult[key.id] === true && <CheckCircle className="h-4 w-4 text-primary" />}
                {verifyResult[key.id] === false && <XCircle className="h-4 w-4 text-destructive" />}

                <Button size="sm" variant="outline" onClick={() => handleVerify(key.id)} disabled={verifyingId === key.id} className="h-8 text-xs">
                  {verifyingId === key.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Verify"}
                </Button>

                <button
                  onClick={() => handleDelete(key.id)}
                  className="hover-surface flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground/30 hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
