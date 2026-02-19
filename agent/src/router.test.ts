import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { routeTask, checkGrantStatus } from "./router.js";
import type { Skill } from "./registry.js";

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch);
  vi.stubEnv("EIGENAI_GRANT_MESSAGE", "test-grant-message");
  vi.stubEnv("EIGENAI_GRANT_SIGNATURE", "test-grant-signature");
  vi.stubEnv("EIGENAI_WALLET_ADDRESS", "0xTestWallet");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

const testSkills: Skill[] = [
  {
    id: "translate",
    description: "Translate text between languages",
    version: "1.0.0",
    author: "test",
    contentHash: "abc123",
    requiresEnv: [],
    hasExecutionManifest: true,
  },
  {
    id: "summarize",
    description: "Summarize long text into bullet points",
    version: "1.0.0",
    author: "test",
    contentHash: "def456",
    requiresEnv: [],
    hasExecutionManifest: true,
  },
  {
    id: "code-review",
    description: "Review code for bugs and improvements",
    version: "1.0.0",
    author: "test",
    contentHash: "ghi789",
    requiresEnv: ["OPENAI_API_KEY"],
    hasExecutionManifest: true,
  },
];

describe("router", () => {
  describe("routeTask", () => {
    it("should route task and return selected skills via tool calling", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          signature: "sig123",
          choices: [
            {
              message: {
                role: "assistant",
                content: null,
                tool_calls: [
                  {
                    function: {
                      name: "select_skills",
                      arguments: JSON.stringify({ skill_ids: ["translate"] }),
                    },
                  },
                ],
              },
            },
          ],
        }),
      });

      const result = await routeTask("Translate this text to French", testSkills);

      expect(result.skillIds).toEqual(["translate"]);
      expect(result.signature).toBe("sig123");
      expect(mockFetch).toHaveBeenCalledOnce();

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain("/api/chat/completions");
      expect(options.method).toBe("POST");

      const body = JSON.parse(options.body);
      expect(body.grantMessage).toBe("test-grant-message");
      expect(body.grantSignature).toBe("test-grant-signature");
      expect(body.walletAddress).toBe("0xTestWallet");
      expect(body.tools).toHaveLength(1);
      expect(body.tools[0].function.name).toBe("select_skills");
    });

    it("should filter out invalid skill IDs from response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          signature: "sig",
          choices: [
            {
              message: {
                tool_calls: [
                  {
                    function: {
                      name: "select_skills",
                      arguments: JSON.stringify({ skill_ids: ["translate", "invalid-skill", "summarize"] }),
                    },
                  },
                ],
              },
            },
          ],
        }),
      });

      const result = await routeTask("Some task", testSkills);

      expect(result.skillIds).toEqual(["translate", "summarize"]);
      expect(result.skillIds).not.toContain("invalid-skill");
    });

    it("should fall back to text extraction when no tool calls", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          signature: "sig",
          choices: [
            {
              message: {
                role: "assistant",
                content: "I recommend using the translate skill for this task.",
              },
            },
          ],
        }),
      });

      const result = await routeTask("Translate something", testSkills);

      expect(result.skillIds).toEqual(["translate"]);
    });

    it("should handle empty skill selection gracefully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          signature: "sig",
          choices: [
            {
              message: {
                tool_calls: [
                  {
                    function: {
                      name: "select_skills",
                      arguments: JSON.stringify({ skill_ids: [] }),
                    },
                  },
                ],
              },
            },
          ],
        }),
      });

      const result = await routeTask("Unknown task", testSkills);

      expect(result.skillIds).toEqual([]);
    });

    it("should throw on non-auth API errors", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => "Internal Server Error",
      });

      await expect(routeTask("Some task", testSkills)).rejects.toThrow("EigenAI request failed: 500");
    });

    it("should retry once on 401 auth errors", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          text: async () => "Unauthorized",
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            signature: "sig",
            choices: [
              {
                message: {
                  tool_calls: [
                    {
                      function: {
                        name: "select_skills",
                        arguments: JSON.stringify({ skill_ids: ["translate"] }),
                      },
                    },
                  ],
                },
              },
            ],
          }),
        });

      const result = await routeTask("Task", testSkills);

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result.skillIds).toEqual(["translate"]);
    });

    it("should fail after retry on persistent auth errors", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        text: async () => "Forbidden",
      });

      await expect(routeTask("Task", testSkills)).rejects.toThrow("grant auth failed after retry");
    });

    it("should handle malformed tool call arguments", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          signature: "sig",
          choices: [
            {
              message: {
                tool_calls: [
                  {
                    function: {
                      name: "select_skills",
                      arguments: "not valid json",
                    },
                  },
                ],
              },
            },
          ],
        }),
      });

      const result = await routeTask("Task", testSkills);

      expect(result.skillIds).toEqual([]);
    });

    it("should include all skills in the system prompt", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          signature: "sig",
          choices: [{ message: { tool_calls: [] } }],
        }),
      });

      await routeTask("Any task", testSkills);

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      const systemMessage = body.messages[0].content;

      expect(systemMessage).toContain("translate");
      expect(systemMessage).toContain("summarize");
      expect(systemMessage).toContain("code-review");
      expect(systemMessage).toContain("Translate text between languages");
    });
  });

  describe("checkGrantStatus", () => {
    it("should return grant status for configured wallet", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          hasGrant: true,
          tokenCount: 1000,
        }),
      });

      const result = await checkGrantStatus();

      expect(result.hasGrant).toBe(true);
      expect(result.tokenCount).toBe(1000);
      expect(result.walletAddress).toBe("0xTestWallet");

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain("checkGrant");
      expect(url).toContain("0xTestWallet");
    });

    it("should return false grant status on API error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const result = await checkGrantStatus();

      expect(result.hasGrant).toBe(false);
      expect(result.tokenCount).toBe(0);
    });
  });
});
