"use client";

import { type AgentInfo } from "@/lib/api";
import { InfoItem } from "./InfoItem";

interface AgentStatusCardProps {
  agent: AgentInfo;
  address: string;
  actionLoading: string | null;
  onAction: (action: "stop" | "start") => void;
  onTerminateClick: () => void;
}

export function AgentStatusCard({
  agent,
  address,
  actionLoading,
  onAction,
  onTerminateClick,
}: AgentStatusCardProps) {
  const statusColor =
    agent.status === "running"
      ? "text-emerald-400"
      : agent.status === "stopped"
        ? "text-amber-400"
        : "text-zinc-400";

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">{agent.name}</h2>
          <div className="mt-1 flex items-center gap-2">
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                agent.status === "running" ? "bg-emerald-400" : "bg-zinc-600"
              }`}
            />
            <span className={`text-sm font-medium capitalize ${statusColor}`}>{agent.status}</span>
          </div>
        </div>

        <div className="flex gap-2">
          {agent.status === "running" && (
            <button
              onClick={() => onAction("stop")}
              disabled={!!actionLoading}
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800 disabled:opacity-50"
            >
              {actionLoading === "stop" ? "Stopping..." : "Stop"}
            </button>
          )}
          {agent.status === "stopped" && (
            <button
              onClick={() => onAction("start")}
              disabled={!!actionLoading}
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800 disabled:opacity-50"
            >
              {actionLoading === "start" ? "Starting..." : "Start"}
            </button>
          )}
          <button
            onClick={onTerminateClick}
            disabled={!!actionLoading}
            className="rounded-lg border border-red-500/30 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-50"
          >
            Terminate
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <InfoItem label="Your wallet" value={address} mono copyable />
        <InfoItem
          label="Agent wallet (ETH)"
          value={agent.walletAddressEth ?? "Pending..."}
          mono
          copyable
        />
        <InfoItem
          label="Agent wallet (Solana)"
          value={agent.walletAddressSol ?? "Pending..."}
          mono
          copyable
        />
        <InfoItem label="Instance IP" value={agent.instanceIp ?? "Provisioning..."} mono />
        <InfoItem
          label="Docker digest"
          value={agent.dockerDigest ? agent.dockerDigest.slice(0, 20) + "..." : "Pending..."}
          mono
        />
        <InfoItem label="Deployed" value={agent.createdAt} />
      </div>
    </div>
  );
}
