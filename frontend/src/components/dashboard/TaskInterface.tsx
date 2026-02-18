"use client";

import { useState } from "react";
import { submitTask, type TaskResult } from "@/lib/api";

interface TaskInterfaceProps {
  token: string;
  canSubmit: boolean;
  onError: (error: string) => void;
}

export function TaskInterface({ token, canSubmit, onError }: TaskInterfaceProps) {
  const [taskInput, setTaskInput] = useState("");
  const [taskResult, setTaskResult] = useState<TaskResult | null>(null);
  const [taskLoading, setTaskLoading] = useState(false);

  async function handleSubmitTask() {
    if (!taskInput.trim() || !canSubmit) return;
    setTaskLoading(true);
    setTaskResult(null);

    try {
      const result = await submitTask(token, taskInput);
      setTaskResult(result);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Task failed");
    } finally {
      setTaskLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
      <h3 className="text-lg font-bold text-white">Submit a Task</h3>
      <p className="mt-1 text-sm text-zinc-400">
        Your agent will route this to the best skill automatically.
      </p>

      <div className="mt-4 flex gap-3">
        <input
          type="text"
          value={taskInput}
          onChange={(e) => setTaskInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmitTask()}
          placeholder={
            canSubmit ? "What do you want your agent to do?" : "Waiting for instance IP..."
          }
          disabled={!canSubmit}
          className="flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white placeholder-zinc-500 focus:border-zinc-500 focus:outline-none disabled:opacity-50"
        />
        <button
          onClick={handleSubmitTask}
          disabled={taskLoading || !taskInput.trim() || !canSubmit}
          className="rounded-xl bg-white px-6 py-3 font-semibold text-zinc-900 transition-colors hover:bg-zinc-200 disabled:opacity-50"
        >
          {taskLoading ? (
            <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-zinc-400 border-t-zinc-900" />
          ) : (
            "Send"
          )}
        </button>
      </div>
      {!canSubmit && (
        <p className="mt-2 text-xs text-amber-400">
          Your agent is still provisioning. The instance IP will appear shortly — this page
          refreshes automatically.
        </p>
      )}

      {taskResult && (
        <div className="mt-4 space-y-3 rounded-xl border border-zinc-800 bg-zinc-950 p-4">
          <div>
            <span className="text-xs font-medium text-zinc-500">Result</span>
            <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-200">{taskResult.result}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {taskResult.skillsUsed.map((skill) => (
              <span
                key={skill}
                className="rounded-full bg-zinc-800 px-3 py-1 text-xs font-medium text-zinc-300"
              >
                {skill}
              </span>
            ))}
          </div>
          <div className="space-y-1 border-t border-zinc-800 pt-3">
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <span>Routing signature:</span>
              <code className="truncate font-mono text-zinc-600">
                {taskResult.routingSignature.slice(0, 32)}...
              </code>
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <span>Agent signature:</span>
              <code className="truncate font-mono text-zinc-600">
                {taskResult.agentSignature.slice(0, 32)}...
              </code>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
