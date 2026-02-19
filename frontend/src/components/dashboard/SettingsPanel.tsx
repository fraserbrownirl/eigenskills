"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Save, Loader2, Eye, EyeOff, AlertCircle, Lock } from "lucide-react";
import { EnvVar, getAgentEnvVars, upgradeAgent } from "@/lib/api";

const GRANT_VAR_KEYS = ["EIGENAI_GRANT_MESSAGE", "EIGENAI_GRANT_SIGNATURE", "EIGENAI_WALLET_ADDRESS"];

function isGrantVar(key: string): boolean {
  return GRANT_VAR_KEYS.includes(key);
}

interface SettingsPanelProps {
  token: string;
  onCancel: () => void;
  onSaved: () => void;
  onError: (error: string | null) => void;
}

export function SettingsPanel({ token, onCancel, onSaved, onError }: SettingsPanelProps) {
  const [envVars, setEnvVars] = useState<EnvVar[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [revealed, setRevealed] = useState<Set<number>>(new Set());

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const vars = await getAgentEnvVars(token);
        if (!cancelled) setEnvVars(vars);
      } catch (err) {
        if (!cancelled) onError(err instanceof Error ? err.message : "Failed to load env vars");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [token, onError]);

  function addEnvVar() {
    setEnvVars([...envVars, { key: "", value: "", isPublic: false }]);
  }

  function removeEnvVar(index: number) {
    if (isGrantVar(envVars[index]?.key ?? "")) return;
    setEnvVars(envVars.filter((_, i) => i !== index));
  }

  function updateEnvVar(index: number, field: keyof EnvVar, value: string | boolean) {
    const key = envVars[index]?.key ?? "";
    if (isGrantVar(key) && (field === "key" || field === "value")) {
      if (field === "key") return;
      if (field === "value") {
        setEnvVars(envVars.map((v, i) => (i === index ? { ...v, value: value as string } : v)));
        return;
      }
    }
    setEnvVars(envVars.map((v, i) => (i === index ? { ...v, [field]: value } : v)));
  }

  function toggleReveal(index: number) {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  async function handleSave() {
    const valid = envVars.filter((v) => v.key.trim() && v.value.trim());
    setSaving(true);
    onError(null);
    try {
      await upgradeAgent(token, valid);
      onSaved();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const canRemove = (index: number) => !isGrantVar(envVars[index]?.key ?? "");

  if (loading) {
    return (
      <Card className="border-zinc-800 bg-zinc-900/50 backdrop-blur-xl">
        <CardContent className="py-16">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p>Loading environment variables...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-zinc-800 bg-zinc-900/50 backdrop-blur-xl">
      <CardHeader>
        <CardTitle>Agent Settings</CardTitle>
        <CardDescription>
          Update your agent&apos;s configuration and environment variables. Grant credentials cannot be removed.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          {envVars.map((envVar, i) => (
            <div
              key={i}
              className="flex flex-col gap-3 rounded-lg border bg-card/50 p-3 sm:flex-row sm:items-start"
            >
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Input
                    type="text"
                    value={envVar.key}
                    onChange={(e) => updateEnvVar(i, "key", e.target.value)}
                    placeholder="KEY_NAME"
                    className="font-mono text-sm"
                    readOnly={isGrantVar(envVar.key)}
                  />
                  {isGrantVar(envVar.key) && (
                    <span title="Required for EigenAI" aria-label="Required for EigenAI">
                      <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    type={revealed.has(i) ? "text" : "password"}
                    value={envVar.value}
                    onChange={(e) => updateEnvVar(i, "value", e.target.value)}
                    placeholder="Value"
                    className="font-mono text-sm flex-1"
                    readOnly={false}
                  />
                  {envVar.value && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleReveal(i)}
                      className="shrink-0"
                      aria-label={revealed.has(i) ? "Hide value" : "Show value"}
                    >
                      {revealed.has(i) ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
                {!isGrantVar(envVar.key) && (
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={envVar.isPublic}
                      onChange={(e) => updateEnvVar(i, "isPublic", e.target.checked)}
                      className="rounded border-input bg-background text-primary focus:ring-primary"
                    />
                    Make public (visible on Verifiability Dashboard)
                  </label>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeEnvVar(i)}
                disabled={!canRemove(i)}
                className="text-muted-foreground hover:text-destructive shrink-0"
                title={canRemove(i) ? "Remove" : "Grant credentials cannot be removed"}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        <Button variant="outline" onClick={addEnvVar} className="w-full border-dashed">
          <Plus className="mr-2 h-4 w-4" />
          Add Variable
        </Button>
      </CardContent>
      <CardFooter className="justify-end gap-2">
        <Button variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
