import { useState } from "react";
import { toast } from "sonner";
import { useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ApiKeysSettings } from "./api-keys";
import { ModelSettings } from "./model-settings";

export function SettingsPage() {
  const { data: session } = useSession();
  const [name, setName] = useState(session?.user?.name ?? "");
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        toast.success("Profile updated");
      } else {
        toast.error("Failed to update profile");
      }
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-2xl space-y-6 p-8">
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>

        <Card className="rounded-xl">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription className="text-muted-foreground/50">
              Update your profile information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-foreground">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  value={session?.user?.email ?? ""}
                  disabled
                  className="opacity-40"
                />
                <p className="text-xs text-muted-foreground/40">
                  Email cannot be changed
                </p>
              </div>

              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium text-foreground">
                  Display name
                </label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  required
                />
              </div>

              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save changes"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <ApiKeysSettings />

        <ModelSettings />
      </div>
    </div>
  );
}
