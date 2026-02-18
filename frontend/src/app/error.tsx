"use client";

import { useEffect } from "react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <div className="max-w-md rounded-2xl border border-red-500/30 bg-red-500/5 p-8 text-center">
        <h2 className="text-xl font-bold text-red-400">Something went wrong</h2>
        <p className="mt-3 text-sm text-zinc-400">
          An unexpected error occurred. Please try again.
        </p>
        {error.digest && (
          <p className="mt-2 font-mono text-xs text-zinc-600">Error ID: {error.digest}</p>
        )}
        <button
          onClick={reset}
          className="mt-6 rounded-xl bg-white px-6 py-3 font-semibold text-zinc-900 transition-colors hover:bg-zinc-200"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
