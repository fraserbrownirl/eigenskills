const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3002";

export interface EnvVar {
  key: string;
  value: string;
  isPublic: boolean;
}

export interface AgentInfo {
  name: string;
  status: string;
  appId: string | null;
  walletAddressEth: string | null;
  walletAddressSol: string | null;
  instanceIp: string | null;
  dockerDigest: string | null;
  createdAt: string;
  healthy: boolean;
}

export interface TaskResult {
  result: string;
  skillsUsed: string[];
  routingSignature: string;
  agentSignature: string;
  agentAddress: string;
  sessionId?: string;
}

function getHeaders(token: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

/**
 * Fetch a server-issued nonce for SIWE authentication.
 * The nonce is valid for 5 minutes and can only be used once.
 */
export async function fetchNonce(): Promise<string> {
  const res = await fetch(`${BACKEND_URL}/api/auth/nonce`);
  if (!res.ok) throw new Error("Failed to fetch nonce");
  const { nonce } = await res.json();
  return nonce;
}

export async function verifyAuth(
  message: string,
  signature: string
): Promise<{ address: string; token: string; hasAgent: boolean }> {
  const res = await fetch(`${BACKEND_URL}/api/auth/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, signature }),
  });
  if (!res.ok) throw new Error("Auth verification failed");
  return res.json();
}

/**
 * Check if a wallet has an active EigenAI grant (via backend proxy to avoid CORS).
 */
export async function getGrantStatus(address: string): Promise<{
  hasGrant: boolean;
  tokenCount: number;
}> {
  const res = await fetch(`${BACKEND_URL}/api/auth/grant?address=${encodeURIComponent(address)}`);
  if (!res.ok) return { hasGrant: false, tokenCount: 0 };
  const data = await res.json();
  return {
    hasGrant: data.hasGrant ?? false,
    tokenCount: data.tokenCount ?? 0,
  };
}

export async function deployAgent(
  token: string,
  name: string,
  envVars: EnvVar[]
): Promise<{ agentId: number; appId: string; walletAddress: string; instanceIp: string }> {
  const res = await fetch(`${BACKEND_URL}/api/agents/deploy`, {
    method: "POST",
    headers: getHeaders(token),
    body: JSON.stringify({ name, envVars }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error ?? "Deploy failed");
  }
  return res.json();
}

export async function upgradeAgent(token: string, envVars: EnvVar[]): Promise<void> {
  const res = await fetch(`${BACKEND_URL}/api/agents/upgrade`, {
    method: "POST",
    headers: getHeaders(token),
    body: JSON.stringify({ envVars }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? "Upgrade failed");
  }
}

export async function getAgentEnvVars(token: string): Promise<EnvVar[]> {
  const res = await fetch(`${BACKEND_URL}/api/agents/env`, {
    headers: getHeaders(token),
  });
  if (res.status === 404) return [];
  if (!res.ok) throw new Error("Failed to get agent env vars");
  const data = await res.json();
  return data.envVars ?? [];
}

export async function stopAgent(token: string): Promise<void> {
  const res = await fetch(`${BACKEND_URL}/api/agents/stop`, {
    method: "POST",
    headers: getHeaders(token),
  });
  if (!res.ok) throw new Error("Stop failed");
}

export async function startAgent(token: string): Promise<void> {
  const res = await fetch(`${BACKEND_URL}/api/agents/start`, {
    method: "POST",
    headers: getHeaders(token),
  });
  if (!res.ok) throw new Error("Start failed");
}

export async function terminateAgent(token: string): Promise<void> {
  const res = await fetch(`${BACKEND_URL}/api/agents/terminate`, {
    method: "POST",
    headers: getHeaders(token),
  });
  if (!res.ok) throw new Error("Terminate failed");
}

export async function getAgentInfo(token: string): Promise<AgentInfo | null> {
  const res = await fetch(`${BACKEND_URL}/api/agents/info`, {
    headers: getHeaders(token),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to get agent info");
  return res.json();
}

export async function submitTask(
  token: string,
  task: string,
  sessionId?: string
): Promise<TaskResult> {
  const res = await fetch(`${BACKEND_URL}/api/agents/task`, {
    method: "POST",
    headers: getHeaders(token),
    body: JSON.stringify({ task, sessionId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Task submission failed");
  }
  return res.json();
}

export interface Skill {
  id: string;
  description: string;
  version: string;
  author: string;
  contentHash: string;
  requiresEnv: string[];
  hasExecutionManifest: boolean;
}

export async function getSkills(token: string): Promise<Skill[]> {
  const res = await fetch(`${BACKEND_URL}/api/agents/skills`, {
    headers: getHeaders(token),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.skills ?? [];
}

export interface HistoryEntry {
  timestamp: string;
  type: string;
  data: Record<string, unknown>;
  agentAddress: string;
  signature: string;
}

export async function getHistory(token: string): Promise<HistoryEntry[]> {
  const res = await fetch(`${BACKEND_URL}/api/agents/history`, {
    headers: getHeaders(token),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.entries ?? [];
}

export async function getLogs(token: string, lines: number = 100): Promise<string> {
  const res = await fetch(`${BACKEND_URL}/api/agents/logs?lines=${lines}`, {
    headers: getHeaders(token),
  });
  if (!res.ok) return "";
  const data = await res.json();
  return data.logs ?? "";
}
