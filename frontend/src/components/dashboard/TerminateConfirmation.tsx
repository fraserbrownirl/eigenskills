"use client";

interface TerminateConfirmationProps {
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function TerminateConfirmation({
  loading,
  onCancel,
  onConfirm,
}: TerminateConfirmationProps) {
  return (
    <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-6">
      <h3 className="text-lg font-bold text-red-400">Terminate Agent?</h3>
      <p className="mt-2 text-sm text-zinc-400">
        This is irreversible. Your agent&apos;s wallet will be destroyed and all funds lost. Make
        sure to withdraw any funds first.
      </p>
      <div className="mt-4 flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 rounded-lg border border-zinc-700 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-900"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="flex-1 rounded-lg bg-red-500 py-2 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-50"
        >
          {loading ? "Terminating..." : "Confirm Terminate"}
        </button>
      </div>
    </div>
  );
}
