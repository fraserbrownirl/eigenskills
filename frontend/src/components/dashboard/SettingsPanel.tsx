"use client";

import { useState } from "react";
import { upgradeAgent, type EnvVar } from "@/lib/api";

interface SettingsPanelProps {
  token: string;
  onCancel: () => void;
  onSaved: () => void;
  onError: (error: string) => void;
}

export function SettingsPanel({ token, onCancel, onSaved, onError }: SettingsPanelProps) {
  const [envVars, setEnvVars] = useState<EnvVar[]>([]);
  const [saving, setSaving] = useState(false);

  function handleAddEnvVar() {
    setEnvVars([...envVars, { key: "", value: "", isPublic: false }]);
  }

  function handleRemoveEnvVar(index: number) {
    setEnvVars(envVars.filter((_, i) => i !== index));
  }

  function handleEnvVarChange(index: number, field: keyof EnvVar, value: string | boolean) {
    const updated = [...envVars];
    updated[index] = { ...updated[index], [field]: value };
    setEnvVars(updated);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await upgradeAgent(token, envVars);
      onSaved();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed to update env vars");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
      <h3 className="text-lg font-bold text-white">Environment Variables</h3>
      <p className="mt-1 text-sm text-zinc-400">
        Update your agent&apos;s API keys. Changes will redeploy the agent.
      </p>

      <div className="mt-4 space-y-3">
        {envVars.map((envVar, idx) => (
          <div key={idx} className="flex gap-2">
            <label htmlFor={`settings-key-${idx}`} className="sr-only">
              Environment variable key
            </label>
            <input
              id={`settings-key-${idx}`}
              type="text"
              value={envVar.key}
              onChange={(e) => handleEnvVarChange(idx, "key", e.target.value.toUpperCase())}
              placeholder="KEY_NAME"
              className="w-40 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 font-mono text-sm text-white placeholder-zinc-600 focus:border-zinc-500 focus:outline-none"
            />
            <label htmlFor={`settings-value-${idx}`} className="sr-only">
              Environment variable value
            </label>
            <input
              id={`settings-value-${idx}`}
              type="password"
              value={envVar.value}
              onChange={(e) => handleEnvVarChange(idx, "value", e.target.value)}
              placeholder="Value"
              className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 font-mono text-sm text-white placeholder-zinc-600 focus:border-zinc-500 focus:outline-none"
            />
            <label className="flex items-center gap-1 text-xs text-zinc-400">
              <input
                type="checkbox"
                checked={envVar.isPublic}
                onChange={(e) => handleEnvVarChange(idx, "isPublic", e.target.checked)}
                className="rounded border-zinc-700"
              />
              Public
            </label>
            <button
              onClick={() => handleRemoveEnvVar(idx)}
              className="px-2 text-zinc-500 hover:text-red-400"
            >
              &times;
            </button>
          </div>
        ))}

        <button
          onClick={handleAddEnvVar}
          className="w-full rounded-lg border border-dashed border-zinc-700 py-2 text-sm text-zinc-500 hover:border-zinc-500 hover:text-zinc-300"
        >
          + Add Variable
        </button>
      </div>

      <div className="mt-6 flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 rounded-lg border border-zinc-700 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-800"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving || envVars.length === 0}
          className="flex-1 rounded-lg bg-white py-2 text-sm font-semibold text-zinc-900 hover:bg-zinc-200 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save & Redeploy"}
        </button>
      </div>
    </div>
  );
}
