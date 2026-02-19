import type { Skill } from "./registry.js";
import { getAgentAddress, signMessage } from "./wallet.js";

const GRANT_API = process.env.EIGENAI_GRANT_API ?? "https://determinal-api.eigenarcade.com";
const MODEL = "gpt-oss-120b-f16";
const MAX_TOKENS = 500;
const SEED = 42;

const DEFAULT_SOUL = `You are a verifiable AI agent running inside an EigenCompute Trusted Execution Environment. You route user tasks to skills from a curated registry, and every action is cryptographically signed by your TEE wallet.

## Personality
- Be genuinely helpful, not performatively helpful
- Be concise when needed, thorough when it matters
- Have opinions — you're allowed to disagree

## Self-Improvement
- When you discover something non-obvious, log it
- When you make a mistake or get corrected, log it
- When a command fails, log the error and the fix
- Review past learnings before major tasks`;

// Extensible context sections injected into every system prompt.
// Later phases append workspace files (TOOLS.md, AGENTS.md) and pending learnings.
const dynamicContextProviders: Array<() => string> = [];

/** Register a function that returns additional system prompt context. */
export function registerContextProvider(fn: () => string): void {
  dynamicContextProviders.push(fn);
}

/** Assemble the full system prompt from SOUL + skill list + dynamic context. */
export function buildSystemPrompt(availableSkills: Skill[]): string {
  const soul = process.env.AGENT_SOUL ?? DEFAULT_SOUL;
  const skillList = availableSkills.map((s) => `- ${s.id}: ${s.description}`).join("\n");

  const sections = [soul];

  for (const provider of dynamicContextProviders) {
    const ctx = provider();
    if (ctx) sections.push(ctx);
  }

  sections.push(
    `Use the select_skills tool to choose which skill(s) to execute.\n\nAvailable skills:\n${skillList}`
  );

  return sections.join("\n\n");
}

interface GrantMessageResponse {
  message: string;
}

interface CheckGrantResponse {
  hasGrant?: boolean;
  tokenCount?: number;
}

interface ChatToolCall {
  id: string;
  type: string;
  function: {
    name: string;
    arguments: string;
  };
}

interface ChatChoice {
  message: {
    role: string;
    content: string | null;
    tool_calls?: ChatToolCall[];
  };
}

interface ChatCompletionResponse {
  signature?: string;
  choices?: ChatChoice[];
}

// Cached grant credentials (message + signature + walletAddress)
let cachedGrant: {
  message: string;
  signature: string;
  walletAddress: string;
} | null = null;

/**
 * Get grant authentication credentials.
 *
 * Priority:
 * 1. User-provided grant credentials (env vars from setup)
 * 2. TEE wallet grant (fetches message and signs with agent wallet)
 *
 * The grant credentials are cached for subsequent requests.
 */
async function getGrantAuth(): Promise<{
  message: string;
  signature: string;
  walletAddress: string;
}> {
  if (cachedGrant) {
    return cachedGrant;
  }

  // Check for user-provided grant credentials first
  const userGrantMessage = process.env.EIGENAI_GRANT_MESSAGE;
  const userGrantSignature = process.env.EIGENAI_GRANT_SIGNATURE;
  const userWalletAddress = process.env.EIGENAI_WALLET_ADDRESS;

  if (userGrantMessage && userGrantSignature && userWalletAddress) {
    console.log(`Using user-provided grant for ${userWalletAddress}`);
    cachedGrant = {
      message: userGrantMessage,
      signature: userGrantSignature,
      walletAddress: userWalletAddress,
    };
    return cachedGrant;
  }

  // Fall back to TEE wallet grant
  const address = getAgentAddress();
  if (address === "0x0000000000000000000000000000000000000000") {
    throw new Error(
      "No grant credentials available: EIGENAI_GRANT_* env vars not set and TEE wallet not available (MNEMONIC not set)"
    );
  }

  console.log(`Fetching grant message for TEE wallet ${address}...`);
  const messageRes = await fetch(`${GRANT_API}/message?address=${address}`);

  if (!messageRes.ok) {
    const errorText = await messageRes.text();
    throw new Error(`Failed to get grant message: ${messageRes.status} ${errorText}`);
  }

  const { message } = (await messageRes.json()) as GrantMessageResponse;
  console.log("Signing grant message with TEE wallet...");
  const signature = await signMessage(message);

  cachedGrant = { message, signature, walletAddress: address };
  console.log("TEE wallet grant authentication cached");
  return cachedGrant;
}

/**
 * Check if the wallet has an active grant with available tokens.
 * Uses user-provided wallet address if available, otherwise TEE wallet.
 */
export async function checkGrantStatus(): Promise<{
  hasGrant: boolean;
  tokenCount: number;
  walletAddress: string;
}> {
  // Use user-provided wallet if available, otherwise TEE wallet
  const address = process.env.EIGENAI_WALLET_ADDRESS ?? getAgentAddress();
  const res = await fetch(`${GRANT_API}/checkGrant?address=${address}`);
  if (!res.ok) {
    return { hasGrant: false, tokenCount: 0, walletAddress: address };
  }
  const data = (await res.json()) as CheckGrantResponse;
  return {
    hasGrant: data.hasGrant ?? false,
    tokenCount: data.tokenCount ?? 0,
    walletAddress: address,
  };
}

// ── EigenAI request helper ──────────────────────────────────────────────────

const MAX_LOOP_TURNS = 8;

interface ChatMessage {
  role: string;
  content: string | null;
  tool_calls?: ChatToolCall[];
  tool_call_id?: string;
  name?: string;
}

export type ToolExecutor = (
  toolName: string,
  args: Record<string, unknown>
) => Promise<string | null>;

/**
 * Low-level EigenAI call. Exported so other modules (e.g. compaction) can reuse.
 */
export async function callEigenAI(
  messages: ChatMessage[],
  tools?: unknown[],
  _retryCount: number = 0
): Promise<ChatCompletionResponse> {
  const grant = await getGrantAuth();

  const body: Record<string, unknown> = {
    model: MODEL,
    seed: SEED,
    max_tokens: MAX_TOKENS,
    messages,
    grantMessage: grant.message,
    grantSignature: grant.signature,
    walletAddress: grant.walletAddress,
  };
  if (tools && tools.length > 0) {
    body.tools = tools;
    body.tool_choice = "auto";
  }

  const response = await fetch(`${GRANT_API}/api/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    if ((response.status === 401 || response.status === 403) && _retryCount < 1) {
      console.warn("Grant auth failed, clearing cache and retrying...");
      cachedGrant = null;
      return callEigenAI(messages, tools, _retryCount + 1);
    }
    throw new Error(`EigenAI request failed: ${response.status} ${errorText}`);
  }

  return (await response.json()) as ChatCompletionResponse;
}

/** Convenience wrapper for simple text-in → text-out calls (compaction, summaries). */
export async function callEigenAIText(
  messages: Array<{ role: string; content: unknown }>
): Promise<string> {
  const data = await callEigenAI(
    messages.map((m) => ({
      role: m.role,
      content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
    }))
  );
  return data.choices?.[0]?.message?.content ?? "";
}

// ── Tool definitions ───────────────────────────────────────────────────────

const SELECT_SKILLS_TOOL = {
  type: "function" as const,
  function: {
    name: "select_skills",
    description: "Select one or more skills to execute for this task, in order",
    parameters: {
      type: "object",
      properties: {
        skill_ids: {
          type: "array",
          items: { type: "string" },
          description: "Ordered list of skill IDs to execute",
        },
      },
      required: ["skill_ids"],
    },
  },
};

// ── Multi-turn agentic loop ────────────────────────────────────────────────

export interface AgentLoopResult {
  response: string;
  skillIds: string[];
  signature: string;
}

/**
 * Multi-turn agentic loop: sends conversation to EigenAI, processes tool
 * calls iteratively, and returns when the model produces a text response.
 *
 * @param conversationHistory — existing messages (system + previous turns)
 * @param availableSkills — filtered skills from registry
 * @param allTools — merged tool definitions (skills + memory + SI)
 * @param executeTool — callback that dispatches tool calls
 */
export async function agentLoop(
  conversationHistory: ChatMessage[],
  availableSkills: Skill[],
  allTools: unknown[],
  executeTool: ToolExecutor
): Promise<AgentLoopResult> {
  const systemPrompt = buildSystemPrompt(availableSkills);
  const validSkillIds = new Set(availableSkills.map((s) => s.id));

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...conversationHistory.filter((m) => m.role !== "system"),
  ];

  const tools = [SELECT_SKILLS_TOOL, ...allTools];
  let lastSignature = "";
  const selectedSkillIds: string[] = [];

  for (let turn = 0; turn < MAX_LOOP_TURNS; turn++) {
    const data = await callEigenAI(messages, tools);
    lastSignature = data.signature ?? "";
    const choice = data.choices?.[0];
    if (!choice) break;

    const toolCalls = choice.message.tool_calls;
    const content = choice.message.content;

    // No tool calls → final text response
    if (!toolCalls || toolCalls.length === 0) {
      return {
        response: content ?? "",
        skillIds: selectedSkillIds,
        signature: lastSignature,
      };
    }

    // Append assistant message with tool_calls to history
    messages.push({
      role: "assistant",
      content: content,
      tool_calls: toolCalls,
    });

    // Process each tool call
    for (const tc of toolCalls) {
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(tc.function.arguments);
      } catch {
        args = {};
      }

      let result: string;

      if (tc.function.name === "select_skills") {
        const ids = (args.skill_ids as string[] ?? []).filter((id) => validSkillIds.has(id));
        selectedSkillIds.push(...ids);
        result = ids.length > 0
          ? `Selected skills: ${ids.join(", ")}`
          : "No valid skills matched.";
      } else {
        const toolResult = await executeTool(tc.function.name, args);
        result = toolResult ?? `Unknown tool: ${tc.function.name}`;
      }

      messages.push({
        role: "tool",
        content: result,
        tool_call_id: tc.id,
        name: tc.function.name,
      });
    }
  }

  // Max turns reached — return whatever we have
  return {
    response: "Reached maximum conversation turns.",
    skillIds: selectedSkillIds,
    signature: lastSignature,
  };
}

// ── Legacy routeTask (backward compat) ─────────────────────────────────────

export interface RoutingResult {
  skillIds: string[];
  signature: string;
  requestMessages: Array<{ role: string; content: string }>;
  responseChoices: Array<{ message: { role: string; content: string | null } }>;
}

export async function routeTask(
  task: string,
  availableSkills: Skill[]
): Promise<RoutingResult> {
  const result = await agentLoop(
    [{ role: "user", content: task }],
    availableSkills,
    [],
    async () => null
  );

  return {
    skillIds: result.skillIds,
    signature: result.signature,
    requestMessages: [{ role: "user", content: task }],
    responseChoices: [{ message: { role: "assistant", content: result.response } }],
  };
}
