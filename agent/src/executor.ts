/**
 * Skill Executor
 *
 * Executes skills in sandboxed subprocesses with:
 * - Restricted environment variables (only what skills declare in requires_env)
 * - Content hash verification for verifiability
 * - fd3 IPC channel for x402 payment requests (PayToll integration)
 *
 * BREAKING CHANGE (v2): Migrated from execSync to spawn with fd3 IPC.
 * All skills continue to work unchanged. Skills that need x402 payments
 * can communicate via fd3 using the paytoll-client.js helper.
 */

import { spawn } from "child_process";
import { createInterface, type Interface as ReadlineInterface } from "readline";
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  cpSync,
  unlinkSync,
  readdirSync,
} from "fs";
import { join, resolve } from "path";
import { createHash } from "crypto";
import matter from "gray-matter";
import { handleX402Request, type X402Request } from "./paytoll.js";

const SKILLS_CACHE_DIR = "/tmp/skillsseal";

const DEFAULT_REGISTRY_REPO = "https://github.com/fraserbrownirl/eigenskills-v2.git";

function getLocalRegistryPath(): string | undefined {
  return process.env.SKILL_REGISTRY_LOCAL;
}

function getRegistryRepo(): string {
  return process.env.SKILL_REGISTRY_REPO ?? DEFAULT_REGISTRY_REPO;
}

const EXEC_TIMEOUT_MS = 30_000;
const EXEC_MAX_BUFFER = 1024 * 1024; // 1MB

const SECURE_FILE_MODE = 0o600;

const SAFE_SKILL_ID_RE = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,62}$/;

function validateSkillId(id: string): string {
  if (!SAFE_SKILL_ID_RE.test(id)) {
    throw new Error(
      `Invalid skill ID "${id}": must be alphanumeric with hyphens/underscores, 1-63 chars`
    );
  }
  return id;
}

function listFilesRecursively(dir: string, baseDir: string = dir): string[] {
  const files: string[] = [];
  const entries = readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFilesRecursively(fullPath, baseDir));
    } else {
      files.push(fullPath.slice(baseDir.length + 1));
    }
  }

  return files;
}

function computeContentHash(skillDir: string): string {
  const files = listFilesRecursively(skillDir).sort();
  const hash = createHash("sha256");

  for (const relPath of files) {
    const content = readFileSync(join(skillDir, relPath), "utf-8");
    hash.update(`${relPath}\n${content}\n`);
  }

  return hash.digest("hex");
}

export interface ExecutionStep {
  command: string;
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface ExecutionResult {
  output: string;
  steps: ExecutionStep[];
  skillId: string;
}

function fetchSkillFolder(skillId: string): string {
  validateSkillId(skillId);
  const skillDir = join(SKILLS_CACHE_DIR, skillId);

  if (existsSync(skillDir)) {
    return skillDir;
  }

  mkdirSync(SKILLS_CACHE_DIR, { recursive: true });

  const localRegistryPath = getLocalRegistryPath();
  if (localRegistryPath) {
    const localSkillPath = resolve(localRegistryPath, skillId);
    if (!existsSync(localSkillPath)) {
      throw new Error(`Skill "${skillId}" not found in local registry at ${localSkillPath}`);
    }
    cpSync(localSkillPath, skillDir, { recursive: true });
    return skillDir;
  }

  // Production mode: use synchronous spawn for git operations
  const repoDir = join(SKILLS_CACHE_DIR, "_repo");
  const registryRepo = getRegistryRepo();
  if (!existsSync(repoDir)) {
    const result = spawnSync("git", [
      "clone",
      "--depth",
      "1",
      "--filter=blob:none",
      "--sparse",
      registryRepo,
      repoDir,
    ]);
    if (result.status !== 0) {
      throw new Error(`Failed to clone registry: ${result.stderr?.toString()}`);
    }
  }

  const sparseResult = spawnSync("git", ["sparse-checkout", "add", `registry/skills/${skillId}`], {
    cwd: repoDir,
  });
  if (sparseResult.status !== 0) {
    throw new Error(`Failed to checkout skill: ${sparseResult.stderr?.toString()}`);
  }

  const sourcePath = join(repoDir, "registry", "skills", skillId);
  if (!existsSync(sourcePath)) {
    throw new Error(`Skill folder not found after checkout: ${skillId}`);
  }

  cpSync(sourcePath, skillDir, { recursive: true });
  return skillDir;
}

import { spawnSync } from "child_process";

function buildSandboxedEnv(requiresEnv: string[]): Record<string, string> {
  const env: Record<string, string> = {
    PATH: process.env.PATH ?? "/usr/local/bin:/usr/bin:/bin",
    HOME: process.env.HOME ?? "/root",
    LANG: "en_US.UTF-8",
  };

  for (const key of requiresEnv) {
    const value = process.env[key];
    if (value) {
      env[key] = value;
    }
  }

  return env;
}

const INPUT_FILE_PATH = "/tmp/skill-input.json";
const OUTPUT_FILE_PATH = "/tmp/skill-output.txt";

export async function executeSkill(
  skillId: string,
  userInput: string,
  expectedHash?: string
): Promise<ExecutionResult> {
  const skillDir = fetchSkillFolder(skillId);

  if (expectedHash) {
    const actualHash = computeContentHash(skillDir);
    if (actualHash !== expectedHash) {
      throw new Error(
        `Skill content hash mismatch for "${skillId}": expected ${expectedHash.slice(0, 16)}..., got ${actualHash.slice(0, 16)}... — possible tampering`
      );
    }
  }

  const skillMdPath = join(skillDir, "SKILL.md");

  if (!existsSync(skillMdPath)) {
    throw new Error(`SKILL.md not found for ${skillId}`);
  }

  const skillMdContent = readFileSync(skillMdPath, "utf-8");
  const { data: frontmatter } = matter(skillMdContent);

  const requiresEnv: string[] = frontmatter.requires_env ?? [];
  const sandboxedEnv = buildSandboxedEnv(requiresEnv);
  const executionSteps: Array<{ run: string }> = frontmatter.execution ?? [];

  const steps: ExecutionStep[] = [];
  let lastOutput = "";

  writeFileSync(INPUT_FILE_PATH, JSON.stringify(userInput), { mode: SECURE_FILE_MODE });

  try {
    if (executionSteps.length > 0) {
      for (const step of executionSteps) {
        const command = step.run
          .replace(/\{\{input\}\}/g, INPUT_FILE_PATH)
          .replace(/\{\{output\}\}/g, OUTPUT_FILE_PATH);

        const result = await runCommandWithIPC(command, skillDir, sandboxedEnv);
        steps.push(result);
        lastOutput = result.stdout;
      }
    } else {
      lastOutput = `Skill ${skillId} has no execution manifest. Input was: ${userInput.slice(0, 100)}`;
      steps.push({
        command: "(no execution manifest)",
        stdout: lastOutput,
        stderr: "",
        exitCode: 0,
      });
    }

    return {
      output: lastOutput.trim(),
      steps,
      skillId,
    };
  } finally {
    try {
      unlinkSync(INPUT_FILE_PATH);
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * Run a command with fd3 IPC support for x402 payment requests.
 *
 * fd3 is a dedicated IPC channel that doesn't interfere with stdout/stderr.
 * Skills that need x402 payments write JSON to fd3; the bridge handles
 * signing and HTTP, then writes the response back to fd3.
 *
 * Skills that don't use fd3 work unchanged — the channel is passive.
 */
async function runCommandWithIPC(
  command: string,
  cwd: string,
  env: Record<string, string>
): Promise<ExecutionStep> {
  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    let timedOut = false;

    // Spawn with fd3 as IPC channel: stdin(0), stdout(1), stderr(2), ipc(3)
    // Using 'pipe' for fd3 creates a bidirectional stream
    const subprocess = spawn("sh", ["-c", command], {
      cwd,
      env,
      stdio: ["pipe", "pipe", "pipe", "pipe"],
    });

    // Get fd3 streams for IPC
    const fd3Read = subprocess.stdio[3] as NodeJS.ReadableStream | null;
    const fd3Write = subprocess.stdio[3] as NodeJS.WritableStream | null;

    // Capture stdout (normal output, unchanged from before)
    subprocess.stdout?.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      stdout += text;
      // Enforce max buffer
      if (stdout.length > EXEC_MAX_BUFFER) {
        stdout = stdout.slice(-EXEC_MAX_BUFFER);
      }
    });

    // Capture stderr
    subprocess.stderr?.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      stderr += text;
      if (stderr.length > EXEC_MAX_BUFFER) {
        stderr = stderr.slice(-EXEC_MAX_BUFFER);
      }
    });

    // Handle fd3 IPC for x402 requests
    let rl: ReadlineInterface | null = null;
    if (fd3Read && fd3Write) {
      rl = createInterface({ input: fd3Read as NodeJS.ReadableStream });

      rl.on("line", async (line: string) => {
        try {
          const msg = JSON.parse(line);
          if (msg.action === "x402_request") {
            const response = await handleX402Request(msg as X402Request);
            (fd3Write as NodeJS.WritableStream).write(JSON.stringify(response) + "\n");
          }
        } catch (err) {
          // Invalid JSON or bridge error — send error response
          const errorResponse = {
            error: "IPC_ERROR",
            message: err instanceof Error ? err.message : String(err),
            recoverable: false,
          };
          (fd3Write as NodeJS.WritableStream).write(JSON.stringify(errorResponse) + "\n");
        }
      });
    }

    // Timeout handling
    const timeout = setTimeout(() => {
      timedOut = true;
      subprocess.kill("SIGTERM");
      // Give it a moment to clean up, then force kill
      setTimeout(() => {
        if (!subprocess.killed) {
          subprocess.kill("SIGKILL");
        }
      }, 1000);
    }, EXEC_TIMEOUT_MS);

    // Handle process completion
    subprocess.on("close", (code: number | null) => {
      clearTimeout(timeout);
      rl?.close();

      if (timedOut) {
        resolve({
          command,
          stdout,
          stderr: stderr + "\n[TIMEOUT] Process killed after " + EXEC_TIMEOUT_MS + "ms",
          exitCode: 124, // Standard timeout exit code
        });
      } else {
        resolve({
          command,
          stdout,
          stderr,
          exitCode: code ?? 1,
        });
      }
    });

    // Handle spawn errors
    subprocess.on("error", (err: Error) => {
      clearTimeout(timeout);
      rl?.close();
      resolve({
        command,
        stdout,
        stderr: stderr + "\n[ERROR] " + err.message,
        exitCode: 1,
      });
    });
  });
}

/**
 * Legacy synchronous command runner (for backward compatibility in tests).
 * @deprecated Use runCommandWithIPC for production. This doesn't support fd3 IPC.
 */
export function runCommandSync(
  command: string,
  cwd: string,
  env: Record<string, string>
): ExecutionStep {
  const result = spawnSync("sh", ["-c", command], {
    cwd,
    env,
    timeout: EXEC_TIMEOUT_MS,
    maxBuffer: EXEC_MAX_BUFFER,
    encoding: "utf-8",
  });

  return {
    command,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    exitCode: result.status ?? 1,
  };
}
