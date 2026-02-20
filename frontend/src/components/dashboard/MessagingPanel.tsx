"use client";

import { TelegramLink } from "./TelegramLink";

interface MessagingPanelProps {
  token: string;
  onError: (error: string | null) => void;
}

export function MessagingPanel({ token, onError }: MessagingPanelProps) {
  return (
    <div className="space-y-6">
      <TelegramLink token={token} onError={onError} />
    </div>
  );
}
