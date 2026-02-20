import { execSync } from "child_process";
import { writeFileSync, unlinkSync, mkdtempSync, chmodSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { randomUUID } from "crypto";

const EIGENCOMPUTE_PRIVATE_KEY = process.env.EIGENCOMPUTE_PRIVATE_KEY ?? "";
const EIGENCOMPUTE_ENVIRONMENT = process.env.EIGENCOMPUTE_ENVIRONMENT ?? "sepolia";
const AGENT_IMAGE_REF = process.env.AGENT_IMAGE_REF ?? "skillsseal/agent:latest";

// GitHub Actions deployment
const GITHUB_TOKEN = process.env.GITHUB_TOKEN ?? "";
const GITHUB_REPO_OWNER = process.env.GITHUB_REPO_OWNER ?? "fraserbrownirl";
const GITHUB_REPO_NAME = process.env.GITHUB_REPO_NAME ?? "skillsseal";
const BACKEND_WEBHOOK_URL = process.env.BACKEND_WEBHOOK_URL ?? "";

// Legacy: DEPLOY_STRATEGY is no longer used — CLI is the only path.
// Kept for backward compatibility but ignored.

// Legacy flag — maps to DEPLOY_STRATEGY for backward compatibility
const USE_GITHUB_ACTIONS = process.env.USE_GITHUB_ACTIONS === "true";

// Validation patterns
const SAFE_NAME_RE = /^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,62}$/;
const ENV_KEY_RE = /^[A-Z][A-Z0-9_]*$/;

// Timeouts (milliseconds)
const TIMEOUT_DEFAULT = 60_000;
const TIMEOUT_DEPLOY = 300_000;
const TIMEOUT_INFO = 30_000;

// Log limits
const MAX_LOG_LINES = 500;

// File permissions
const DIR_PERMS = 0o700;
const FILE_PERMS = 0o600;

/**
 * Validate a string before it is interpolated into a shell command.
 * Allows only alphanumeric characters, hyphens, underscores, and dots.
 */
function validateShellInput(input: string, label: string): string {
  if (!SAFE_NAME_RE.test(input)) {
    throw new Error(
      `Invalid ${label}: must start with alphanumeric, contain only [a-zA-Z0-9_.-], and be 1-63 chars`
    );
  }
  return input;
}

/**
 * Validate environment variable key and value to prevent injection attacks.
 */
function validateEnvVar(key: string, value: string): void {
  // Validate key format (must be uppercase with underscores)
  if (!ENV_KEY_RE.test(key)) {
    throw new Error(
      `Invalid env var key "${key}": must start with uppercase letter, contain only [A-Z0-9_]`
    );
  }

  // Reject null characters (truly dangerous)
  if (value.includes("\0")) {
    throw new Error(`Invalid env var value for "${key}": cannot contain null characters`);
  }
}

/**
 * Escape a value for safe inclusion in an env file.
 * Uses double quotes and escapes internal quotes, backslashes, and special chars.
 */
function escapeEnvValue(value: string): string {
  // If value contains special characters, wrap in double quotes and escape
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

/**
 * Construct a .env file from user-provided env vars.
 * Appends _PUBLIC suffix for public variables.
 * Uses a private temp directory with restricted permissions.
 * Validates all keys and values before writing.
 */
function buildEnvFile(envVars: EnvVar[]): string {
  const lines: string[] = [];

  for (const { key, value, isPublic } of envVars) {
    // Validate before processing
    validateEnvVar(key, value);

    const envKey = isPublic && !key.endsWith("_PUBLIC") ? `${key}_PUBLIC` : key;
    lines.push(`${envKey}=${escapeEnvValue(value)}`);
  }

  const secureDir = mkdtempSync(join(tmpdir(), "skillsseal-"));
  chmodSync(secureDir, DIR_PERMS);
  const filepath = join(secureDir, "env");
  writeFileSync(filepath, lines.join("\n") + "\n", { mode: FILE_PERMS });
  return filepath;
}

interface ExecOptions {
  encoding: "utf-8";
  timeout: number;
  env: NodeJS.ProcessEnv;
}

/**
 * Get exec options with environment variables for ecloud CLI.
 * The oclif-based ecloud CLI reads ECLOUD_PRIVATE_KEY for auth.
 */
function getExecOptions(
  timeoutMs: number = TIMEOUT_DEFAULT,
  extraEnv: Record<string, string> = {}
): ExecOptions {
  return {
    encoding: "utf-8" as const,
    timeout: timeoutMs,
    env: {
      ...process.env,
      ECLOUD_PRIVATE_KEY: EIGENCOMPUTE_PRIVATE_KEY,
      ...extraEnv,
    },
  };
}

/**
 * Execute a shell command with sanitized error messages.
 * Prevents private keys from leaking in error output.
 */
function execWithSanitizedErrors(command: string, options: Parameters<typeof execSync>[1]): string {
  try {
    return execSync(command, options) as string;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const sanitized = message.replace(/--private-key\s+\S+/g, "--private-key [REDACTED]");
    throw new Error(sanitized, { cause: err });
  }
}

interface EcloudCommandOptions {
  interactive?: boolean;
  timeout?: number;
  extraFlags?: string[];
}

/**
 * Build and execute an ecloud CLI command with common options.
 * - Adds --environment and --private-key flags automatically
 * - Pipes "echo N |" for interactive commands to auto-answer prompts
 * - Sanitizes error output to prevent key leakage
 */
function runEcloudCommand(
  subcommand: string,
  appId: string | null,
  options: EcloudCommandOptions = {}
): string {
  const { interactive = false, timeout = TIMEOUT_DEFAULT, extraFlags = [] } = options;

  const parts = [`ecloud compute app ${subcommand}`];
  if (appId) {
    parts.push(appId);
  }
  parts.push(`--environment ${EIGENCOMPUTE_ENVIRONMENT}`);
  parts.push(`--private-key ${EIGENCOMPUTE_PRIVATE_KEY}`);
  parts.push(...extraFlags);

  const command = parts.join(" ");
  const fullCommand = interactive ? `echo "n" | ${command}` : command;

  return execWithSanitizedErrors(fullCommand, getExecOptions(timeout));
}

/**
 * Result of triggering a GitHub Actions deployment.
 * The actual deployment completes asynchronously via webhook callback.
 */
export interface AsyncDeployResult {
  dispatchId: string;
  pending: true;
}

/**
 * Trigger a GitHub Actions workflow to deploy/upgrade an agent.
 * Returns a dispatch ID that can be used to track the deployment status.
 */
export async function triggerGitHubDeploy(
  action: "deploy-agent" | "upgrade-agent",
  payload: {
    appName: string;
    appId?: string;
    envVars: EnvVar[];
  }
): Promise<AsyncDeployResult> {
  if (!GITHUB_TOKEN) {
    throw new Error(
      "GITHUB_TOKEN is not set. Create a GitHub token with 'repo' scope and add it to backend/.env"
    );
  }

  if (!BACKEND_WEBHOOK_URL) {
    throw new Error(
      "BACKEND_WEBHOOK_URL is not set. Add your backend's public URL to backend/.env"
    );
  }

  const dispatchId = randomUUID();

  // Build env vars as base64-encoded .env file content
  const envLines: string[] = [];
  for (const { key, value, isPublic } of payload.envVars) {
    validateEnvVar(key, value);
    const envKey = isPublic && !key.endsWith("_PUBLIC") ? `${key}_PUBLIC` : key;
    envLines.push(`${envKey}=${escapeEnvValue(value)}`);
  }
  const envVarsBase64 = Buffer.from(envLines.join("\n") + "\n").toString("base64");

  const response = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}/dispatches`,
    {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({
        event_type: action,
        client_payload: {
          dispatch_id: dispatchId,
          app_name: payload.appName,
          app_id: payload.appId ?? "",
          image_ref: AGENT_IMAGE_REF,
          environment: EIGENCOMPUTE_ENVIRONMENT,
          env_vars: envVarsBase64,
          callback_url: `${BACKEND_WEBHOOK_URL}/api/webhook/deploy-result`,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GitHub Actions dispatch failed: ${response.status} ${errorText}`);
  }

  console.log(`Triggered ${action} workflow with dispatch_id: ${dispatchId}`);
  return { dispatchId, pending: true };
}

/**
 * Deploy via CLI with all flags specified.
 *
 * Interactive prompts:
 * 1. "Build from verifiable source?" (y/N)
 * 2. If yes: "Choose verifiable source type:" (list selection) — requires TTY
 *
 * NOTE: Verifiable builds require a real TTY for the list selection prompt.
 * Since we can't simulate TTY without `expect`, we always use non-verifiable.
 * The verifiable parameter is logged but not used until EigenCloud adds a CLI flag.
 */
async function deployViaCli(
  name: string,
  envVars: EnvVar[],
  verifiable: boolean
): Promise<DeployResult> {
  if (!EIGENCOMPUTE_PRIVATE_KEY) {
    throw new Error(
      "EIGENCOMPUTE_PRIVATE_KEY is not set. " +
        "Create backend/.env with your ecloud private key. " +
        "Get your key from: ecloud auth login"
    );
  }

  const safeName = validateShellInput(name, "agent name");
  const envFilePath = buildEnvFile(envVars);

  try {
    const command = [
      "ecloud compute app deploy",
      `--name ${safeName}`,
      `--image-ref ${AGENT_IMAGE_REF}`,
      "--instance-type g1-standard-4t",
      "--resource-usage-monitoring disable",
      `--env-file ${envFilePath}`,
      "--skip-profile",
      "--log-visibility private",
      `--environment ${EIGENCOMPUTE_ENVIRONMENT}`,
      `--private-key ${EIGENCOMPUTE_PRIVATE_KEY}`,
    ].join(" ");

    console.log(`[CLI] Deploying agent: ${safeName}`);
    console.log(`[CLI] Image: ${AGENT_IMAGE_REF}`);
    if (verifiable) {
      console.log(`[CLI] Note: Verifiable builds require TTY — deploying without verification`);
    }

    // Always answer "n" — verifiable builds require TTY for list selection prompt
    const fullCommand = `echo "n" | ${command}`;

    const output = execWithSanitizedErrors(fullCommand, getExecOptions(TIMEOUT_DEPLOY));

    const appIdMatch =
      output.match(/App ID:\s*(\S+)/i) ?? output.match(/\bID:\s*(0x[a-fA-F0-9]+)/i);
    const ethMatch =
      output.match(/EVM Address:\s*(0x[a-fA-F0-9]+)/i) ??
      output.match(/Ethereum:\s*(0x[a-fA-F0-9]+)/i);
    const solMatch = output.match(/Solana Address:\s*(\S+)/i) ?? output.match(/Solana:\s*(\S+)/i);
    const ipMatch = output.match(/\bIP:\s*(\d+\.\d+\.\d+\.\d+)/i);
    const digestMatch = output.match(/Docker Digest:\s*(\S+)/i);

    return {
      appId: appIdMatch?.[1] ?? "",
      walletAddressEth: ethMatch?.[1] ?? "",
      walletAddressSol: solMatch?.[1] ?? "",
      instanceIp: ipMatch?.[1] ?? "",
      dockerDigest: digestMatch?.[1] ?? "",
    };
  } finally {
    try {
      unlinkSync(envFilePath);
    } catch {
      // ignore cleanup errors
    }
  }
}

/**
 * Deploy a new agent instance to EigenCompute.
 *
 * Strategy:
 * 1. GitHub Actions if configured (async)
 * 2. CLI primary — requires Docker for TEE auto-layering
 * 3. SDK fallback — no Docker needed, but no verifiable builds
 */
export async function deployAgent(
  name: string,
  envVars: EnvVar[],
  verifiable: boolean = false
): Promise<DeployResult | AsyncDeployResult> {
  const safeName = validateShellInput(name, "agent name");

  // GitHub Actions (async) if configured
  if (USE_GITHUB_ACTIONS) {
    return triggerGitHubDeploy("deploy-agent", {
      appName: safeName,
      envVars,
    });
  }

  // CLI deploy (primary path) — requires Docker
  try {
    return await deployViaCli(safeName, envVars, verifiable);
  } catch (cliError) {
    const errorMsg = cliError instanceof Error ? cliError.message : String(cliError);

    // If Docker not available, fall back to SDK
    if (errorMsg.includes("Docker is not running") || errorMsg.includes("docker")) {
      console.log("[CLI] Docker not available, falling back to SDK");
      try {
        const sdk = await import("./eigencompute-sdk.js");
        return await sdk.deployAgent(safeName, envVars);
      } catch (sdkError) {
        console.error("[SDK fallback failed]", sdkError);
        throw sdkError;
      }
    }

    throw cliError;
  }
}

/**
 * Check if a deploy result is async (pending webhook callback).
 */
export function isAsyncDeployResult(
  result: DeployResult | AsyncDeployResult
): result is AsyncDeployResult {
  return "pending" in result && result.pending === true;
}

export interface AppInfo {
  instanceIp: string;
  dockerDigest: string;
  walletAddressEth: string;
  walletAddressSol: string;
}

// Cache for getAppInfo to avoid hammering the ecloud API on repeated polls.
// Maps appId -> { data, fetchedAt }
const appInfoCache = new Map<string, { data: AppInfo; fetchedAt: number; failed?: boolean }>();
const INFO_CACHE_TTL_MS = 30_000;
const INFO_FAIL_COOLDOWN_MS = 60_000;

/**
 * Fetch live app details from EigenCompute via `ecloud compute app info`.
 *
 * The deploy output does not always include Instance IP — it only becomes
 * available after provisioning completes, so we query it separately.
 *
 * Results are cached to avoid 429 rate-limit errors from rapid polling.
 */
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
    const output = runEcloudCommand("info", safeAppId, { timeout: TIMEOUT_INFO });

    const ipMatch = output.match(/\bIP:\s*(\d+\.\d+\.\d+\.\d+)/i);
    const digestMatch = output.match(/Docker Digest:\s*(\S+)/i);
    const ethMatch = output.match(/EVM Address:\s*(0x[a-fA-F0-9]+)/i);
    const solMatch = output.match(/Solana Address:\s*(\S+)/i);

    const data: AppInfo = {
      instanceIp: ipMatch?.[1] ?? "",
      dockerDigest: digestMatch?.[1] ?? "",
      walletAddressEth: ethMatch?.[1] ?? "",
      walletAddressSol: solMatch?.[1] ?? "",
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

/**
 * Upgrade an existing agent's env vars and/or Docker image.
 * Wallet address, grants, and instance IP are preserved across upgrades.
 * A new cryptographic attestation is generated for the updated image.
 */
export async function upgradeAgent(
  appId: string,
  envVars: EnvVar[]
): Promise<void | AsyncDeployResult> {
  const safeAppId = validateShellInput(appId, "app ID");

  if (USE_GITHUB_ACTIONS) {
    return triggerGitHubDeploy("upgrade-agent", {
      appName: safeAppId,
      appId: safeAppId,
      envVars,
    });
  }

  const envFilePath = buildEnvFile(envVars);

  try {
    runEcloudCommand("upgrade", safeAppId, {
      interactive: true,
      timeout: TIMEOUT_DEPLOY,
      extraFlags: [`--env-file ${envFilePath}`, `--image-ref ${AGENT_IMAGE_REF}`],
    });
  } finally {
    try {
      unlinkSync(envFilePath);
    } catch {
      // ignore
    }
  }
}

/**
 * Stop an agent (preserves wallet + IP).
 */
export async function stopAgent(appId: string): Promise<void> {
  const safeAppId = validateShellInput(appId, "app ID");
  runEcloudCommand("stop", safeAppId, { interactive: true });
}

/**
 * Start a stopped agent.
 */
export async function startAgent(appId: string): Promise<void> {
  const safeAppId = validateShellInput(appId, "app ID");
  runEcloudCommand("start", safeAppId, { interactive: true });
}

/**
 * Terminate an agent (IRREVERSIBLE — wallet destroyed).
 */
export async function terminateAgent(appId: string): Promise<void> {
  const safeAppId = validateShellInput(appId, "app ID");
  runEcloudCommand("terminate", safeAppId, { interactive: true });
}

/**
 * Get application logs from EigenCompute.
 */
export async function getAppLogs(appId: string, lines: number = 100): Promise<string> {
  const safeAppId = validateShellInput(appId, "app ID");
  const safeLines = Math.min(Math.max(1, Math.floor(lines)), MAX_LOG_LINES);
  return runEcloudCommand("logs", safeAppId, {
    timeout: TIMEOUT_INFO,
    extraFlags: [`--tail ${safeLines}`],
  });
}
