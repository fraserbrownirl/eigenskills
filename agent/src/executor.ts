import { execSync } from "child_process";
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

const SKILLS_CACHE_DIR = "/tmp/eigenskills";

// Remote registry for production (can be overridden via env)
const DEFAULT_REGISTRY_REPO = "https://github.com/fraserbrownirl/eigenskills-v2.git";

function getLocalRegistryPath(): string | undefined {
  return process.env.SKILL_REGISTRY_LOCAL;
}

function getRegistryRepo(): string {
  return process.env.SKILL_REGISTRY_REPO ?? DEFAULT_REGISTRY_REPO;
}

// Execution limits
const EXEC_TIMEOUT_MS = 30_000;
const EXEC_MAX_BUFFER = 1024 * 1024; // 1MB

// File permissions
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

/**
 * Recursively list all files in a directory.
 */
function listFilesRecursively(dir: string, baseDir: string = dir): string[] {
  const files: string[] = [];
  const entries = readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFilesRecursively(fullPath, baseDir));
    } else {
      // Store relative path from base directory
      files.push(fullPath.slice(baseDir.length + 1));
    }
  }

  return files;
}

/**
 * Compute SHA-256 content hash of a skill folder.
 * Files are sorted alphabetically and concatenated to ensure deterministic hash.
 */
function computeContentHash(skillDir: string): string {
  const files = listFilesRecursively(skillDir).sort();
  const hash = createHash("sha256");

  for (const relPath of files) {
    const content = readFileSync(join(skillDir, relPath), "utf-8");
    // Include filename in hash to detect renames
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

/**
 * Fetch a skill folder from local registry or remote git repo.
 * In development, set SKILL_REGISTRY_LOCAL to use local files.
 * In production, uses git sparse-checkout to pull only the specific skill.
 */
function fetchSkillFolder(skillId: string): string {
  validateSkillId(skillId);
  const skillDir = join(SKILLS_CACHE_DIR, skillId);

  // Return cached skill if already fetched
  if (existsSync(skillDir)) {
    return skillDir;
  }

  mkdirSync(SKILLS_CACHE_DIR, { recursive: true });

  // Development mode: copy from local registry
  const localRegistryPath = getLocalRegistryPath();
  if (localRegistryPath) {
    const localSkillPath = resolve(localRegistryPath, skillId);
    if (!existsSync(localSkillPath)) {
      throw new Error(`Skill "${skillId}" not found in local registry at ${localSkillPath}`);
    }
    cpSync(localSkillPath, skillDir, { recursive: true });
    return skillDir;
  }

  // Production mode: clone from git
  const repoDir = join(SKILLS_CACHE_DIR, "_repo");
  const registryRepo = getRegistryRepo();
  if (!existsSync(repoDir)) {
    execSync(`git clone --depth 1 --filter=blob:none --sparse "${registryRepo}" "${repoDir}"`, {
      stdio: "pipe",
    });
  }

  execSync(`cd "${repoDir}" && git sparse-checkout add "registry/skills/${skillId}"`, {
    stdio: "pipe",
  });

  const sourcePath = join(repoDir, "registry", "skills", skillId);
  if (!existsSync(sourcePath)) {
    throw new Error(`Skill folder not found after checkout: ${skillId}`);
  }

  cpSync(sourcePath, skillDir, { recursive: true });
  return skillDir;
}

/**
 * Build a sandboxed environment containing only the vars the skill declared.
 */
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

// Paths for secure input/output file handling
const INPUT_FILE_PATH = "/tmp/skill-input.json";
const OUTPUT_FILE_PATH = "/tmp/skill-output.txt";

/**
 * Execute a skill with sandboxed environment variables.
 * User input is passed via a file to prevent shell injection.
 * If expectedHash is provided, verifies the skill content matches before execution.
 */
export async function executeSkill(
  skillId: string,
  userInput: string,
  expectedHash?: string
): Promise<ExecutionResult> {
  const skillDir = fetchSkillFolder(skillId);

  // Verify content hash if provided (important for verifiability)
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

  // Write user input to a file instead of substituting into shell commands
  // This prevents shell injection attacks
  writeFileSync(INPUT_FILE_PATH, JSON.stringify(userInput), { mode: SECURE_FILE_MODE });

  try {
    if (executionSteps.length > 0) {
      for (const step of executionSteps) {
        // Replace template variables with file paths (not inline content)
        const command = step.run
          .replace(/\{\{input\}\}/g, INPUT_FILE_PATH)
          .replace(/\{\{output\}\}/g, OUTPUT_FILE_PATH);

        const result = runCommand(command, skillDir, sandboxedEnv);
        steps.push(result);
        lastOutput = result.stdout;
      }
    } else {
      // No execution manifest — return a message (skills should have manifests)
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
    // Clean up input file
    try {
      unlinkSync(INPUT_FILE_PATH);
    } catch {
      // Ignore cleanup errors
    }
  }
}

function runCommand(command: string, cwd: string, env: Record<string, string>): ExecutionStep {
  try {
    const stdout = execSync(command, {
      cwd,
      env,
      timeout: EXEC_TIMEOUT_MS,
      maxBuffer: EXEC_MAX_BUFFER,
      encoding: "utf-8",
    });

    return { command, stdout: stdout ?? "", stderr: "", exitCode: 0 };
  } catch (error: unknown) {
    const execError = error as {
      stdout?: string;
      stderr?: string;
      status?: number;
    };
    return {
      command,
      stdout: execError.stdout ?? "",
      stderr: execError.stderr ?? "",
      exitCode: execError.status ?? 1,
    };
  }
}
