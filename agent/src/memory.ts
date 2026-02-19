import { signMessage } from "./wallet.js";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3002";

export interface MemoryEntry {
  key: string;
  content: string;
  updatedAt: string;
}

// In-memory cache — loaded from backend on first access
let memoryCache: Map<string, MemoryEntry> | null = null;

async function ensureLoaded(): Promise<Map<string, MemoryEntry>> {
  if (memoryCache) return memoryCache;

  memoryCache = new Map();
  try {
    const res = await fetch(`${BACKEND_URL}/api/agents/memory`, {
      headers: { "Content-Type": "application/json" },
    });
    if (res.ok) {
      const data = (await res.json()) as { entries: MemoryEntry[] };
      for (const entry of data.entries) {
        memoryCache.set(entry.key, entry);
      }
    }
  } catch (err) {
    console.warn("Failed to load memory from backend:", err);
  }
  return memoryCache;
}

export async function saveMemory(key: string, content: string): Promise<string> {
  const cache = await ensureLoaded();
  const signature = await signMessage(JSON.stringify({ key, content }));

  cache.set(key, { key, content, updatedAt: new Date().toISOString() });

  try {
    await fetch(`${BACKEND_URL}/api/agents/memory`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, content, signature }),
    });
  } catch (err) {
    console.warn("Failed to save memory to backend:", err);
  }

  return `Saved to memory: ${key}`;
}

export async function searchMemory(query: string): Promise<string> {
  const cache = await ensureLoaded();
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);

  const results: MemoryEntry[] = [];
  for (const entry of cache.values()) {
    const text = `${entry.key} ${entry.content}`.toLowerCase();
    if (words.some((w) => text.includes(w))) {
      results.push(entry);
    }
  }

  if (results.length === 0) return "No matching memories found.";

  return results
    .map((e) => `--- ${e.key} ---\n${e.content}`)
    .join("\n\n");
}

/** EigenAI tool definitions for memory operations. */
export const MEMORY_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "save_memory",
      description:
        "Save important information to long-term memory. Survives session resets and agent restarts.",
      parameters: {
        type: "object",
        properties: {
          key: {
            type: "string",
            description: "Short label, e.g. 'user-prefs', 'project-notes'",
          },
          content: {
            type: "string",
            description: "The information to remember",
          },
        },
        required: ["key", "content"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "memory_search",
      description:
        "Search long-term memory for relevant information. Use at the start of conversations to recall context.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "What to search for",
          },
        },
        required: ["query"],
      },
    },
  },
];

/** Execute a memory tool call, returns the result string or null if not a memory tool. */
export async function executeMemoryTool(
  toolName: string,
  args: Record<string, unknown>
): Promise<string | null> {
  if (toolName === "save_memory") {
    return saveMemory(args.key as string, args.content as string);
  }
  if (toolName === "memory_search") {
    return searchMemory(args.query as string);
  }
  return null;
}
