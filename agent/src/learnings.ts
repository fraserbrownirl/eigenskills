import { signMessage } from "./wallet.js";
import { registerContextProvider } from "./router.js";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3002";

interface LearningEntry {
  entryId: string;
  entryType: "LRN" | "ERR" | "FEAT";
  category?: string;
  summary: string;
  content: string;
  priority?: string;
  area?: string;
  createdAt: string;
  status: string;
}

let learningsCache: LearningEntry[] | null = null;
let lastFetchAt = 0;
const CACHE_TTL_MS = 60_000;

async function fetchLearnings(query?: string): Promise<LearningEntry[]> {
  const now = Date.now();
  if (!query && learningsCache && now - lastFetchAt < CACHE_TTL_MS) {
    return learningsCache;
  }

  const url = query
    ? `${BACKEND_URL}/api/agents/learnings?q=${encodeURIComponent(query)}`
    : `${BACKEND_URL}/api/agents/learnings`;

  try {
    const res = await fetch(url, {
      headers: { "Content-Type": "application/json" },
    });
    if (res.ok) {
      const data = (await res.json()) as { entries: LearningEntry[] };
      if (!query) {
        learningsCache = data.entries;
        lastFetchAt = now;
      }
      return data.entries;
    }
  } catch (err) {
    console.warn("Failed to fetch learnings:", err);
  }
  return learningsCache ?? [];
}

function generateEntryId(type: string): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 6);
  return `${type}-${ts}-${rand}`;
}

async function createLearning(
  entryType: "LRN" | "ERR" | "FEAT",
  summary: string,
  content: string,
  opts?: { category?: string; priority?: string; area?: string }
): Promise<string> {
  const entryId = generateEntryId(entryType);
  const payload = { entryId, entryType, summary, content, ...opts };
  const signature = await signMessage(JSON.stringify(payload));

  try {
    await fetch(`${BACKEND_URL}/api/agents/learnings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, signature }),
    });
    learningsCache = null;
  } catch (err) {
    console.warn("Failed to save learning:", err);
  }

  return `Logged ${entryType}: ${entryId} — ${summary}`;
}

// ── 5 Self-Improvement Tools ───────────────────────────────────────────────

async function logLearning(args: Record<string, unknown>): Promise<string> {
  return createLearning("LRN", args.summary as string, args.content as string, {
    category: args.category as string | undefined,
    priority: args.priority as string | undefined,
  });
}

async function logError(args: Record<string, unknown>): Promise<string> {
  return createLearning("ERR", args.summary as string, args.content as string, {
    category: "error",
    priority: args.priority as string ?? "high",
  });
}

async function logFeatureRequest(args: Record<string, unknown>): Promise<string> {
  return createLearning("FEAT", args.summary as string, args.content as string, {
    category: "feature-request",
    priority: args.priority as string ?? "medium",
  });
}

async function searchLearningsHandler(args: Record<string, unknown>): Promise<string> {
  const entries = await fetchLearnings(args.query as string);
  if (entries.length === 0) return "No matching learnings found.";
  return entries
    .slice(0, 10)
    .map((e) => `[${e.entryType}] ${e.entryId}: ${e.summary}`)
    .join("\n");
}

async function promoteLearning(args: Record<string, unknown>): Promise<string> {
  const entryId = args.entry_id as string;
  const targetFile = args.target_file as string;
  const appendText = args.content as string;

  // Load current file content from workspace
  let existing = "";
  try {
    const res = await fetch(
      `${BACKEND_URL}/api/agents/workspace/${encodeURIComponent(targetFile)}`,
      { headers: { "Content-Type": "application/json" } }
    );
    if (res.ok) {
      const data = (await res.json()) as { content: string | null };
      existing = data.content ?? "";
    }
  } catch {
    // file doesn't exist yet
  }

  const newContent = existing ? `${existing}\n\n${appendText}` : appendText;
  const signature = await signMessage(JSON.stringify({ filename: targetFile, content: newContent }));

  try {
    await fetch(`${BACKEND_URL}/api/agents/workspace/${encodeURIComponent(targetFile)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newContent, signature }),
    });
  } catch (err) {
    console.warn("Failed to save workspace file:", err);
    return `Failed to promote ${entryId} to ${targetFile}`;
  }

  // Mark the learning as promoted
  try {
    await fetch(`${BACKEND_URL}/api/agents/learnings/${encodeURIComponent(entryId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "promoted", promotedTo: targetFile }),
    });
    learningsCache = null;
  } catch {
    // non-critical
  }

  return `Promoted ${entryId} to ${targetFile}`;
}

// ── EigenAI Tool Definitions ───────────────────────────────────────────────

export const SI_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "log_learning",
      description: "Log a new insight or non-obvious discovery for future reference.",
      parameters: {
        type: "object",
        properties: {
          summary: { type: "string", description: "One-line summary" },
          content: { type: "string", description: "Full details" },
          category: { type: "string", description: "e.g. 'command', 'config', 'pattern'" },
          priority: { type: "string", enum: ["low", "medium", "high"] },
        },
        required: ["summary", "content"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "log_error",
      description: "Log an error encountered during task execution, including the fix if known.",
      parameters: {
        type: "object",
        properties: {
          summary: { type: "string", description: "What went wrong" },
          content: { type: "string", description: "Error details, stack trace, and fix" },
          priority: { type: "string", enum: ["medium", "high", "critical"] },
        },
        required: ["summary", "content"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "log_feature_request",
      description: "Log a requested or suggested feature/improvement.",
      parameters: {
        type: "object",
        properties: {
          summary: { type: "string", description: "Feature summary" },
          content: { type: "string", description: "What was asked for and why" },
          priority: { type: "string", enum: ["low", "medium", "high"] },
        },
        required: ["summary", "content"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "search_learnings",
      description: "Search past learnings, errors, and feature requests.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "What to search for" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "promote_learning",
      description:
        "Promote a high-value learning into a persistent workspace file (e.g. SOUL.md, TOOLS.md) so it influences future behaviour permanently.",
      parameters: {
        type: "object",
        properties: {
          entry_id: { type: "string", description: "The learning entry ID to promote" },
          target_file: {
            type: "string",
            description: "File to append to, e.g. 'SOUL.md', 'TOOLS.md', 'AGENTS.md'",
          },
          content: { type: "string", description: "Text to append to the file" },
        },
        required: ["entry_id", "target_file", "content"],
      },
    },
  },
];

/** Execute a self-improvement tool call, returns null if not a SI tool. */
export async function executeSITool(
  toolName: string,
  args: Record<string, unknown>
): Promise<string | null> {
  switch (toolName) {
    case "log_learning":
      return logLearning(args);
    case "log_error":
      return logError(args);
    case "log_feature_request":
      return logFeatureRequest(args);
    case "search_learnings":
      return searchLearningsHandler(args);
    case "promote_learning":
      return promoteLearning(args);
    default:
      return null;
  }
}

// ── Detection Functions ────────────────────────────────────────────────────

const CORRECTION_PATTERNS = [
  /no,?\s+(actually|that'?s wrong|that'?s not|that isn'?t)/i,
  /\bwrong\b.*\binstead\b/i,
  /\bactually\b.*\bshould\b/i,
  /don'?t\s+(do|use|say)\s+that/i,
  /\bcorrection\b/i,
];

const FEATURE_PATTERNS = [
  /\bcan you\b.*\bnew\b/i,
  /\bwould be (nice|great|better|useful)\b/i,
  /\bfeature request\b/i,
  /\bI wish\b/i,
  /\bplease add\b/i,
  /\bcan we add\b/i,
];

export function detectCorrection(userMessage: string): boolean {
  return CORRECTION_PATTERNS.some((p) => p.test(userMessage));
}

export function detectFeatureRequest(userMessage: string): boolean {
  return FEATURE_PATTERNS.some((p) => p.test(userMessage));
}

export function detectExecutionError(output: string, exitCode: number | null): boolean {
  if (exitCode !== null && exitCode !== 0) return true;
  return /\b(error|exception|traceback|failed|panic)\b/i.test(output);
}

// ── Dynamic Context Provider ───────────────────────────────────────────────

async function buildLearningContext(): Promise<string> {
  const entries = await fetchLearnings();
  const pending = entries.filter((e) => e.status === "pending").slice(0, 5);
  if (pending.length === 0) return "";

  const lines = pending.map((e) => `- [${e.entryType}] ${e.summary}`);
  return `## Recent Learnings\n${lines.join("\n")}`;
}

/** Register the learning context provider with the router's system prompt. */
export function initSelfImprovement(): void {
  registerContextProvider(() => {
    // Synchronous wrapper — uses cached data.
    // fetchLearnings() is called async elsewhere to populate the cache.
    if (!learningsCache || learningsCache.length === 0) return "";
    const pending = learningsCache.filter((e) => e.status === "pending").slice(0, 5);
    if (pending.length === 0) return "";
    const lines = pending.map((e) => `- [${e.entryType}] ${e.summary}`);
    return `## Recent Learnings\n${lines.join("\n")}`;
  });

  // Prime the cache on startup
  buildLearningContext().catch(() => {});
}
