"use client";

import { useState } from "react";

interface InfoItemProps {
  label: string;
  value: string;
  mono?: boolean;
  copyable?: boolean;
}

export function InfoItem({ label, value, mono, copyable }: InfoItemProps) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-w-0">
      <span className="text-xs font-medium text-zinc-500">{label}</span>
      <div className="flex items-center gap-1">
        <p className={`truncate text-sm text-zinc-200 ${mono ? "font-mono" : ""}`}>{value}</p>
        {copyable && (
          <button
            onClick={handleCopy}
            className="shrink-0 rounded p-1 text-zinc-500 transition-colors hover:text-zinc-300"
            aria-label={copied ? "Copied" : "Copy to clipboard"}
          >
            {copied ? (
              <svg
                className="h-3.5 w-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="M20 6L9 17l-5-5" />
              </svg>
            ) : (
              <svg
                className="h-3.5 w-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
              </svg>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
