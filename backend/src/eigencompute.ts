import { execSync } from "child_process";
import { writeFileSync, unlinkSync, mkdtempSync, chmodSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

const EIGENCOMPUTE_PRIVATE_KEY = process.env.EIGENCOMPUTE_PRIVATE_KEY ?? "";
const EIGENCOMPUTE_ENVIRONMENT = process.env.EIGENCOMPUTE_ENVIRONMENT ?? "sepolia";
const AGENT_IMAGE_REF = process.env.AGENT_IMAGE_REF ?? "eigenskills/agent:latest";

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

  // Reject dangerous characters in values that could inject additional env vars
  if (value.includes("\n") || value.includes("\r") || value.includes("\0")) {
    throw new Error(
      `Invalid env var value for "${key}": cannot contain newlines or null characters`
    );
  }
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
    lines.push(`${envKey}=${value}`);
  }

  const secureDir = mkdtempSync(join(tmpdir(), "eigenskills-"));
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
 * - Adds --environment flag automatically
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
  parts.push(...extraFlags);

  const command = parts.join(" ");
  const fullCommand = interactive ? `echo N | ${command}` : command;

  return execWithSanitizedErrors(fullCommand, getExecOptions(timeout));
}

/**
 * Deploy a new agent instance to EigenCompute.
 *
 * In production, this would call the EigenCompute REST API directly.
 * For now, it shells out to the ecloud CLI.
 */
export async function deployAgent(name: string, envVars: EnvVar[]): Promise<DeployResult> {
  const safeName = validateShellInput(name, "agent name");

  if (!EIGENCOMPUTE_PRIVATE_KEY) {
    throw new Error(
      "EIGENCOMPUTE_PRIVATE_KEY is not set. " +
        "Create backend/.env with your ecloud private key. " +
        "Get your key from: ecloud auth login"
    );
  }

  const envFilePath = buildEnvFile(envVars);

  try {
    const command = [
      "ecloud compute app deploy",
      `--image-ref ${AGENT_IMAGE_REF}`,
      `--env-file ${envFilePath}`,
      `--environment ${EIGENCOMPUTE_ENVIRONMENT}`,
      "--log-visibility public",
      "--resource-usage-monitoring enable",
      "--instance-type g1-standard-4t",
      "--skip-profile",
      `--name ${safeName}`,
    ].join(" ");

    console.log(`Deploying agent: ${safeName}`);
    console.log(`Image: ${AGENT_IMAGE_REF}`);

    const execOpts = getExecOptions(TIMEOUT_DEPLOY);
    const output = execWithSanitizedErrors(`echo N | ${command}`, execOpts);

    // Parse deployment output for app details.
    // ecloud output labels vary between versions -- try multiple patterns.
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

    // ecloud app info output format (example):
    //   IP:             203.0.113.45
    //   EVM Address:    0xecf5...  (path: m/44'/60'/0'/0/0)
    //   Solana Address: 6kcV4...   (path: m/44'/501'/0'/0')
    //   Docker Digest:  sha256:... (may not always appear)
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
export async function upgradeAgent(appId: string, envVars: EnvVar[]): Promise<void> {
  const safeAppId = validateShellInput(appId, "app ID");
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
