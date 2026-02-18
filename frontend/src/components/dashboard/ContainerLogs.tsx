"use client";

interface ContainerLogsProps {
  logs: string;
  loading: boolean;
  onRefresh: () => void;
}

export function ContainerLogs({ logs, loading, onRefresh }: ContainerLogsProps) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">Container Logs</h3>
          <p className="mt-1 text-sm text-zinc-400">
            Live output from your agent container on EigenCompute.
          </p>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="text-xs text-zinc-500 hover:text-zinc-300 disabled:opacity-50"
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      <pre className="mt-4 max-h-96 overflow-auto rounded-lg bg-zinc-950 p-4 font-mono text-xs text-zinc-400">
        {logs || "No logs available."}
      </pre>
    </div>
  );
}
