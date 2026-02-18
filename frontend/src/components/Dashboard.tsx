"use client";

import { useState } from "react";
import { stopAgent, startAgent, terminateAgent } from "@/lib/api";
import { useAgentPolling, type TabType } from "@/hooks/useAgentPolling";
import {
  AgentStatusCard,
  ContainerLogs,
  ExecutionHistory,
  SettingsPanel,
  SkillsList,
  TabNavigation,
  TaskInterface,
  TerminateConfirmation,
} from "./dashboard";

interface DashboardProps {
  token: string;
  address: string;
  onAgentTerminated: () => void;
}

export default function Dashboard({ token, address, onAgentTerminated }: DashboardProps) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showTerminateConfirm, setShowTerminateConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("task");

  const {
    agent,
    loading,
    skills,
    history,
    logs,
    logsLoading,
    error,
    setError,
    refreshInfo,
    refreshHistory,
    refreshLogs,
  } = useAgentPolling({ token, activeTab });

  async function handleAction(action: "stop" | "start" | "terminate") {
    setActionLoading(action);
    setError(null);
    try {
      if (action === "stop") await stopAgent(token);
      else if (action === "start") await startAgent(token);
      else if (action === "terminate") {
        await terminateAgent(token);
        onAgentTerminated();
        return;
      }
      await refreshInfo();
    } catch (err) {
      setError(err instanceof Error ? err.message : `${action} failed`);
    } finally {
      setActionLoading(null);
      setShowTerminateConfirm(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-white" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="py-20 text-center text-zinc-400">No agent found. Something went wrong.</div>
    );
  }

  const canSubmitTask = !!agent.instanceIp;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <AgentStatusCard
        agent={agent}
        address={address}
        actionLoading={actionLoading}
        onAction={handleAction}
        onTerminateClick={() => setShowTerminateConfirm(true)}
      />

      {showTerminateConfirm && (
        <TerminateConfirmation
          loading={actionLoading === "terminate"}
          onCancel={() => setShowTerminateConfirm(false)}
          onConfirm={() => handleAction("terminate")}
        />
      )}

      {agent.status === "running" && (
        <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
      )}

      {agent.status === "running" && activeTab === "task" && (
        <TaskInterface token={token} canSubmit={canSubmitTask} onError={setError} />
      )}

      {agent.status === "running" && activeTab === "skills" && <SkillsList skills={skills} />}

      {agent.status === "running" && activeTab === "history" && (
        <ExecutionHistory history={history} onRefresh={refreshHistory} />
      )}

      {agent.status === "running" && activeTab === "logs" && (
        <ContainerLogs logs={logs} loading={logsLoading} onRefresh={refreshLogs} />
      )}

      {agent.status === "running" && activeTab === "settings" && (
        <SettingsPanel
          token={token}
          onCancel={() => setActiveTab("task")}
          onSaved={() => setActiveTab("task")}
          onError={setError}
        />
      )}

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
          {error}
        </div>
      )}
    </div>
  );
}
