import { createECloudClient, type ECloudClient, type AppId } from "@layr-labs/ecloud-sdk";
import { writeFileSync, unlinkSync, mkdtempSync, chmodSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import type { Hex } from "viem";

const EIGENCOMPUTE_PRIVATE_KEY = process.env.EIGENCOMPUTE_PRIVATE_KEY ?? "";
const EIGENCOMPUTE_ENVIRONMENT = process.env.EIGENCOMPUTE_ENVIRONMENT ?? "sepolia";
const AGENT_IMAGE_REF = process.env.AGENT_IMAGE_REF ?? "skillsseal/agent:latest";
const EIGENCOMPUTE_RPC_URL = process.env.EIGENCOMPUTE_RPC_URL ?? "";

const SAFE_NAME_RE = /^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,62}$/;
const ENV_KEY_RE = /^[A-Z][A-Z0-9_]*$/;

const DIR_PERMS = 0o700;
const FILE_PERMS = 0o600;

export interface EnvVar {
  key: string;
  value: string;
  isPublic: boolean;
}

export interface DeployResult {
  appId: string;
  walletAddressEth: string;
  walletAddressSol: string;
  instanceIp: string;
  dockerDigest: string;
}

export interface AppInfo {
  instanceIp: string;
  dockerDigest: string;
  walletAddressEth: string;
  walletAddressSol: string;
}

function validateShellInput(input: string, label: string): string {
  if (!SAFE_NAME_RE.test(input)) {
    throw new Error(
      `Invalid ${label}: must start with alphanumeric, contain only [a-zA-Z0-9_.-], and be 1-63 chars`
    );
  }
  return input;
}

function validateEnvVar(key: string, value: string): void {
  if (!ENV_KEY_RE.test(key)) {
    throw new Error(
      `Invalid env var key "${key}": must start with uppercase letter, contain only [A-Z0-9_]`
    );
  }
  if (value.includes("\0")) {
    throw new Error(`Invalid env var value for "${key}": cannot contain null characters`);
  }
}

function escapeEnvValue(value: string): string {
  if (/[\n\r"'\\$`]/.test(value) || value.includes(" ")) {
    const escaped = value
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/\$/g, "\\$")
      .replace(/`/g, "\\`")
      .replace(/\n/g, "\\n")
      .replace(/\r/g, "\\r");
    return `"${escaped}"`;
  }
  return value;
}

function buildEnvFile(envVars: EnvVar[]): string {
  const lines: string[] = [];

  for (const { key, value, isPublic } of envVars) {
    validateEnvVar(key, value);
    const envKey = isPublic && !key.endsWith("_PUBLIC") ? `${key}_PUBLIC` : key;
    lines.push(`${envKey}=${escapeEnvValue(value)}`);
  }

  const secureDir = mkdtempSync(join(tmpdir(), "skillsseal-"));
  chmodSync(secureDir, DIR_PERMS);
  const filepath = join(secureDir, ".env");
  writeFileSync(filepath, lines.join("\n") + "\n", { mode: FILE_PERMS });
  return filepath;
}

function formatPrivateKey(key: string): Hex {
  const trimmed = key.trim();
  return (trimmed.startsWith("0x") ? trimmed : `0x${trimmed}`) as Hex;
}

let _client: ECloudClient | null = null;

function getClient(): ECloudClient {
  if (_client) return _client;

  if (!EIGENCOMPUTE_PRIVATE_KEY) {
    throw new Error(
      "EIGENCOMPUTE_PRIVATE_KEY is not set. " +
        "Create backend/.env with your ecloud private key. " +
        "Get your key from: ecloud auth login"
    );
  }

  const config: Parameters<typeof createECloudClient>[0] = {
    verbose: false,
    privateKey: formatPrivateKey(EIGENCOMPUTE_PRIVATE_KEY),
    environment: EIGENCOMPUTE_ENVIRONMENT,
  };

  if (EIGENCOMPUTE_RPC_URL) {
    config.rpcUrl = EIGENCOMPUTE_RPC_URL;
  }

  _client = createECloudClient(config);
  return _client;
}

async function getImageDigest(imageRef: string): Promise<string> {
  const parts = imageRef.split(":");
  const tag = parts.pop() ?? "latest";
  const repo = parts.join(":");

  const url = `https://hub.docker.com/v2/repositories/${repo}/tags/${tag}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch image digest for ${imageRef}: ${res.status}`);
  }
  const data = (await res.json()) as {
    digest?: string;
    images?: { architecture: string; digest: string }[];
  };

  const amd64 = data.images?.find((i) => i.architecture === "amd64");
  const digest = amd64?.digest ?? data.digest;

  if (!digest) {
    throw new Error(`No digest found for ${imageRef}`);
  }

  return digest;
}

export async function deployAgent(name: string, envVars: EnvVar[]): Promise<DeployResult> {
  const safeName = validateShellInput(name, "agent name");
  const client = getClient();

  const envFilePath = buildEnvFile(envVars);

  try {
    console.log(`[SDK] Deploying agent: ${safeName}`);
    console.log(`[SDK] Image: ${AGENT_IMAGE_REF}`);
    console.log(`[SDK] Environment: ${EIGENCOMPUTE_ENVIRONMENT}`);

    const imageDigest = await getImageDigest(AGENT_IMAGE_REF);
    console.log(`[SDK] Image digest: ${imageDigest}`);

    const { prepared, gasEstimate } = await client.compute.app.prepareDeployFromVerifiableBuild({
      name: safeName,
      imageRef: AGENT_IMAGE_REF,
      imageDigest,
      envFile: envFilePath,
      instanceType: "g1-standard-4t",
      logVisibility: "private",
      resourceUsageMonitoring: "enable",
    });

    console.log(`[SDK] Gas estimate ready`);

    const result = await client.compute.app.executeDeploy(prepared, gasEstimate);
    console.log(`[SDK] Deploy tx: ${result.txHash}`);
    console.log(`[SDK] App ID: ${result.appId}`);

    const ipAddress = await client.compute.app.watchDeployment(result.appId);
    console.log(`[SDK] Instance IP: ${ipAddress ?? "pending"}`);

    return {
      appId: result.appId,
      walletAddressEth: "",
      walletAddressSol: "",
      instanceIp: ipAddress ?? "",
      dockerDigest: imageDigest,
    };
  } finally {
    try {
      unlinkSync(envFilePath);
    } catch {
      // ignore cleanup errors
    }
  }
}

export async function upgradeAgent(appId: string, envVars: EnvVar[]): Promise<void> {
  const safeAppId = validateShellInput(appId, "app ID");
  const client = getClient();
  const appIdHex = safeAppId as AppId;

  const envFilePath = buildEnvFile(envVars);

  try {
    const imageDigest = await getImageDigest(AGENT_IMAGE_REF);

    const { prepared, gasEstimate } = await client.compute.app.prepareUpgradeFromVerifiableBuild(
      appIdHex,
      {
        imageRef: AGENT_IMAGE_REF,
        imageDigest,
        envFile: envFilePath,
        instanceType: "g1-standard-4t",
        logVisibility: "private",
        resourceUsageMonitoring: "enable",
      }
    );

    await client.compute.app.executeUpgrade(prepared, gasEstimate);
    await client.compute.app.watchUpgrade(appIdHex);
  } finally {
    try {
      unlinkSync(envFilePath);
    } catch {
      // ignore
    }
  }
}

export async function stopAgent(appId: string): Promise<void> {
  const safeAppId = validateShellInput(appId, "app ID");
  await getClient().compute.app.stop(safeAppId as AppId);
}

export async function startAgent(appId: string): Promise<void> {
  const safeAppId = validateShellInput(appId, "app ID");
  await getClient().compute.app.start(safeAppId as AppId);
}

export async function terminateAgent(appId: string): Promise<void> {
  const safeAppId = validateShellInput(appId, "app ID");
  await getClient().compute.app.terminate(safeAppId as AppId);
}

const appInfoCache = new Map<string, { data: AppInfo; fetchedAt: number; failed?: boolean }>();
const INFO_CACHE_TTL_MS = 30_000;
const INFO_FAIL_COOLDOWN_MS = 60_000;

export async function getAppInfo(appId: string): Promise<AppInfo> {
  const safeAppId = validateShellInput(appId, "app ID");
  const cached = appInfoCache.get(safeAppId);
  if (cached) {
    const age = Date.now() - cached.fetchedAt;
    if (!cached.failed && age < INFO_CACHE_TTL_MS) return cached.data;
    if (cached.failed && age < INFO_FAIL_COOLDOWN_MS)
      throw new Error("Skipping app info fetch (cooldown after previous failure)");
  }

  try {
    // Instance IP and wallet addresses are stored in our DB from the deploy result.
    // The SDK doesn't expose a standalone getAppInfo — the UserAPI client is internal.
    const data: AppInfo = {
      instanceIp: "",
      dockerDigest: "",
      walletAddressEth: "",
      walletAddressSol: "",
    };

    appInfoCache.set(safeAppId, { data, fetchedAt: Date.now() });
    return data;
  } catch (err) {
    appInfoCache.set(safeAppId, {
      data: { instanceIp: "", dockerDigest: "", walletAddressEth: "", walletAddressSol: "" },
      fetchedAt: Date.now(),
      failed: true,
    });
    throw err;
  }
}

export async function getAppLogs(appId: string, _lines: number = 100): Promise<string> {
  const safeAppId = validateShellInput(appId, "app ID");
  // The SDK logs function streams to stdout; for now return empty
  // TODO: capture log output from SDK
  return `[SDK] Logs for ${safeAppId} — use 'ecloud compute app logs' for full output`;
}
