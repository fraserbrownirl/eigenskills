"use client";

import { type HistoryEntry } from "@/lib/api";

const MAX_DISPLAY_ENTRIES = 50;
const MAX_DATA_PREVIEW_LENGTH = 200;

interface ExecutionHistoryProps {
  history: HistoryEntry[];
  onRefresh: () => void;
}

export function ExecutionHistory({ history, onRefresh }: ExecutionHistoryProps) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">Execution History</h3>
          <p className="mt-1 text-sm text-zinc-400">
            Signed log of all tasks and routing decisions.
          </p>
        </div>
        <button onClick={onRefresh} className="text-xs text-zinc-500 hover:text-zinc-300">
          Refresh
        </button>
      </div>

      {history.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-500">
          No execution history yet. Submit a task to see it here.
        </p>
      ) : (
        <div className="mt-4 space-y-2">
          {history.slice(0, MAX_DISPLAY_ENTRIES).map((entry, idx) => {
            const dataStr = JSON.stringify(entry.data, null, 2);
            const isTruncated = dataStr.length > MAX_DATA_PREVIEW_LENGTH;

            return (
              <div key={idx} className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                <div className="flex items-center justify-between">
                  <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-300">
                    {entry.type}
                  </span>
                  <span className="text-xs text-zinc-600">
                    {new Date(entry.timestamp).toLocaleString()}
                  </span>
                </div>
                <pre className="mt-2 overflow-x-auto text-xs text-zinc-400">
                  {dataStr.slice(0, MAX_DATA_PREVIEW_LENGTH)}
                  {isTruncated && "..."}
                </pre>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
