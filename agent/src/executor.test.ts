import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { writeFileSync, mkdirSync, rmSync, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { executeSkill } from "./executor.js";

const TEST_DIR = join(
  tmpdir(),
  `executor-test-${Date.now()}-${Math.random().toString(36).slice(2)}`
);
const SKILLS_DIR = join(TEST_DIR, "skills");

beforeEach(() => {
  mkdirSync(SKILLS_DIR, { recursive: true });
  // Set local registry path so executor doesn't try to clone from git
  vi.stubEnv("SKILL_REGISTRY_LOCAL", SKILLS_DIR);
  // Clear the skills cache before each test
  const cacheDir = "/tmp/skillsseal";
  if (existsSync(cacheDir)) {
    rmSync(cacheDir, { recursive: true, force: true });
  }
});

afterEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
  vi.unstubAllEnvs();
});

function createTestSkill(
  skillId: string,
  options: {
    execution?: Array<{ run: string }>;
    requires_env?: string[];
    name?: string;
    description?: string;
  } = {}
) {
  const {
    execution = [],
    requires_env = [],
    name = "Test Skill",
    description = "A test skill",
  } = options;

  const skillDir = join(SKILLS_DIR, skillId);
  mkdirSync(skillDir, { recursive: true });

  const frontmatter = {
    name,
    description,
    version: "1.0.0",
    author: "test",
    ...(requires_env.length > 0 && { requires_env }),
    ...(execution.length > 0 && { execution }),
  };

  const yaml = Object.entries(frontmatter)
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        if (key === "execution") {
          return `${key}:\n${(value as Array<{ run: string }>).map((v) => `  - run: "${v.run}"`).join("\n")}`;
        }
        return `${key}:\n${value.map((v) => `  - ${v}`).join("\n")}`;
      }
      return `${key}: ${JSON.stringify(value)}`;
    })
    .join("\n");

  const content = `---\n${yaml}\n---\n\n# ${name}\n\n${description}`;
  writeFileSync(join(skillDir, "SKILL.md"), content);

  return skillDir;
}

describe("executor", () => {
  describe("executeSkill", () => {
    it("should execute a simple echo command", async () => {
      createTestSkill("echo-test", {
        execution: [{ run: "echo hello" }],
      });

      const result = await executeSkill("echo-test", "test input");

      expect(result.output).toBe("hello");
      expect(result.skillId).toBe("echo-test");
      expect(result.steps).toHaveLength(1);
      expect(result.steps[0].exitCode).toBe(0);
    });

    it("should substitute input file path in commands", async () => {
      createTestSkill("input-test", {
        execution: [{ run: "cat {{input}}" }],
      });

      const result = await executeSkill("input-test", "my test input");

      expect(result.output).toBe('"my test input"');
      expect(result.steps[0].exitCode).toBe(0);
    });

    it("should handle multiple execution steps", async () => {
      createTestSkill("multi-step", {
        execution: [{ run: "echo step1" }, { run: "echo step2" }, { run: "echo step3" }],
      });

      const result = await executeSkill("multi-step", "input");

      expect(result.steps).toHaveLength(3);
      expect(result.output).toBe("step3");
    });

    it("should return output from last step", async () => {
      createTestSkill("last-output", {
        execution: [{ run: "echo first" }, { run: "echo second" }],
      });

      const result = await executeSkill("last-output", "input");

      expect(result.output).toBe("second");
    });

    it("should capture command failures", async () => {
      createTestSkill("fail-test", {
        execution: [{ run: "exit 42" }],
      });

      const result = await executeSkill("fail-test", "input");

      expect(result.steps[0].exitCode).toBe(42);
    });

    it("should handle skill with no execution manifest", async () => {
      createTestSkill("no-exec", {});

      const result = await executeSkill("no-exec", "some input here");

      expect(result.output).toContain("no execution manifest");
      expect(result.output).toContain("some input");
    });

    it("should reject invalid skill IDs", async () => {
      await expect(executeSkill("../escape", "input")).rejects.toThrow("Invalid skill ID");
      await expect(executeSkill("skill with spaces", "input")).rejects.toThrow("Invalid skill ID");
      await expect(executeSkill("", "input")).rejects.toThrow("Invalid skill ID");
    });

    it("should sandbox environment variables", async () => {
      vi.stubEnv("SECRET_KEY", "super-secret");
      vi.stubEnv("ALLOWED_KEY", "allowed-value");

      createTestSkill("env-test", {
        requires_env: ["ALLOWED_KEY"],
        execution: [{ run: "echo $ALLOWED_KEY-$SECRET_KEY" }],
      });

      const result = await executeSkill("env-test", "input");

      expect(result.output).toBe("allowed-value-");
    });

    it("should always include PATH, HOME, and LANG in environment", async () => {
      createTestSkill("basic-env", {
        execution: [{ run: "echo $PATH | head -c 10" }],
      });

      const result = await executeSkill("basic-env", "input");

      expect(result.steps[0].exitCode).toBe(0);
      expect(result.output.length).toBeGreaterThan(0);
    });

    it("should verify content hash when provided", async () => {
      createTestSkill("hash-test", {
        execution: [{ run: "echo ok" }],
      });

      await expect(executeSkill("hash-test", "input", "invalid-hash")).rejects.toThrow(
        "content hash mismatch"
      );
    });

    it("should throw when skill not found", async () => {
      await expect(executeSkill("nonexistent-skill", "input")).rejects.toThrow(
        "not found in local registry"
      );
    });
  });
});
