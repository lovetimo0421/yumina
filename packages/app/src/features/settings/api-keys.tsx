import { useState, useEffect } from "react";
import { Plus, Trash2, CheckCircle, XCircle, Loader2, Key } from "lucide-react";
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

export function ApiKeysSettings() {
  const [keys, setKeys] = useState<ApiKeyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newLabel, setNewLabel] = useState("Default");
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [verifyResult, setVerifyResult] = useState<Record<string, boolean | null>>({});

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
    if (!newKey.trim()) return;

    setAdding(true);
    try {
      const res = await fetch(`${apiBase}/api/keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          key: newKey,
          label: newLabel || "Default",
          provider: "openrouter",
        }),
      });

      if (res.ok) {
        setNewKey("");
        setNewLabel("Default");
        await fetchKeys();
      }
    } catch {
      // Silently fail
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`${apiBase}/api/keys/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        setKeys((prev) => prev.filter((k) => k.id !== id));
      }
    } catch {
      // Silently fail
    }
  };

  const handleVerify = async (id: string) => {
    setVerifyingId(id);
    setVerifyResult((prev) => ({ ...prev, [id]: null }));
    try {
      const res = await fetch(`${apiBase}/api/keys/${id}/verify`, {
        method: "POST",
        credentials: "include",
      });
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          API Keys
        </CardTitle>
        <CardDescription>
          Manage your LLM provider API keys. Keys are encrypted at rest and
          never displayed after saving.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add new key form */}
        <form onSubmit={handleAdd} className="flex flex-col gap-3">
          <div className="flex gap-2">
            <Input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Label"
              className="w-32"
            />
            <Input
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              placeholder="sk-or-v1-..."
              type="password"
              className="flex-1"
            />
            <Button type="submit" disabled={adding || !newKey.trim()}>
              {adding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Get your API key from{" "}
            <a
              href="https://openrouter.ai/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              OpenRouter
            </a>
          </p>
        </form>

        {/* Key list */}
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : keys.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No API keys saved. Add one above to start chatting.
          </p>
        ) : (
          <div className="space-y-2">
            {keys.map((key) => (
              <div
                key={key.id}
                className="flex items-center gap-3 rounded-md border border-border p-3"
              >
                <div className="flex-1">
                  <p className="text-sm font-medium">{key.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {key.provider} &middot;{" "}
                    {new Date(key.createdAt).toLocaleDateString()}
                  </p>
                </div>

                {/* Verify result indicator */}
                {verifyResult[key.id] === true && (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                )}
                {verifyResult[key.id] === false && (
                  <XCircle className="h-4 w-4 text-destructive" />
                )}

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleVerify(key.id)}
                  disabled={verifyingId === key.id}
                >
                  {verifyingId === key.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    "Verify"
                  )}
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => handleDelete(key.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
