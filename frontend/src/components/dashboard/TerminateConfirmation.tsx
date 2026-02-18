"use client";

import { useEffect, useRef } from "react";

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
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelButtonRef.current?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !loading) {
        onCancel();
      }
      if (e.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [loading, onCancel]);

  return (
    <div
      ref={dialogRef}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="terminate-title"
      aria-describedby="terminate-description"
      className="rounded-2xl border border-red-500/30 bg-red-500/5 p-6"
    >
      <h3 id="terminate-title" className="text-lg font-bold text-red-400">
        Terminate Agent?
      </h3>
      <p id="terminate-description" className="mt-2 text-sm text-zinc-400">
        This is irreversible. Your agent&apos;s wallet will be destroyed and all funds lost. Make
        sure to withdraw any funds first.
      </p>
      <div className="mt-4 flex gap-3">
        <button
          ref={cancelButtonRef}
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
