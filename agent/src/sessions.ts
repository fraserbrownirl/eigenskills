import { signMessage } from "./wallet.js";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3002";
const COMPACT_TOKEN_THRESHOLD = 100_000;
const CHARS_PER_TOKEN = 4;

export interface Message {
  role: string;
  content: unknown;
}

// ── In-Memory Session Store ────────────────────────────────────────────────

const sessions = new Map<string, Message[]>();

// ── Async Mutex (per-session locking) ──────────────────────────────────────

const locks = new Map<string, Promise<void>>();

export async function withSessionLock<T>(
  sessionKey: string,
  fn: () => Promise<T>
): Promise<T> {
  while (locks.has(sessionKey)) {
    await locks.get(sessionKey);
  }

  let resolve: () => void;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  locks.set(sessionKey, promise);

  try {
    return await fn();
  } finally {
    locks.delete(sessionKey);
    resolve!();
  }
}

// ── Session CRUD ───────────────────────────────────────────────────────────

export async function loadSession(sessionId: string): Promise<Message[]> {
  if (sessions.has(sessionId)) {
    return sessions.get(sessionId)!;
  }

  try {
    const res = await fetch(
      `${BACKEND_URL}/api/agents/sessions/load?sessionId=${encodeURIComponent(sessionId)}`,
      { headers: { "Content-Type": "application/json" } }
    );

    if (res.ok) {
      const data = (await res.json()) as { messages: Message[] };
      const msgs = data.messages ?? [];
      sessions.set(sessionId, msgs);
      return msgs;
    }
  } catch (err) {
    console.warn("Failed to load session from backend:", err);
  }

  sessions.set(sessionId, []);
  return [];
}

export function getSessionMessages(sessionId: string): Message[] {
  return sessions.get(sessionId) ?? [];
}

export function appendMessage(sessionId: string, message: Message): void {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, []);
  }
  sessions.get(sessionId)!.push(message);
}

export async function saveSession(sessionId: string): Promise<void> {
  const messages = sessions.get(sessionId);
  if (!messages) return;

  const payload = JSON.stringify(messages);
  const signature = await signMessage(payload);

  try {
    await fetch(`${BACKEND_URL}/api/agents/sessions/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, messages, signature }),
    });
  } catch (err) {
    console.warn("Failed to save session to backend:", err);
  }
}

export function resetSession(sessionId: string): void {
  sessions.set(sessionId, []);
}

// ── Token Estimation & Context Compaction ──────────────────────────────────

function estimateTokens(messages: Message[]): number {
  return messages.reduce((sum, m) => sum + JSON.stringify(m).length, 0) / CHARS_PER_TOKEN;
}

/**
 * When the session exceeds the token threshold, summarize the older half
 * via EigenAI and replace with a compact summary message.
 *
 * Uses the same Grant API as the router for the summarization call.
 */
export async function compactSession(
  sessionId: string,
  callEigenAI: (messages: Message[]) => Promise<string>
): Promise<Message[]> {
  const messages = sessions.get(sessionId) ?? [];
  if (estimateTokens(messages) < COMPACT_TOKEN_THRESHOLD) {
    return messages;
  }

  console.log(`Compacting session ${sessionId} (${messages.length} messages)...`);

  const split = Math.floor(messages.length / 2);
  const old = messages.slice(0, split);
  const recent = messages.slice(split);

  const summaryText = await callEigenAI([
    {
      role: "user",
      content:
        "Summarize this conversation concisely. Preserve:\n" +
        "- Key facts about the user (name, preferences)\n" +
        "- Important decisions made\n" +
        "- Open tasks or TODOs\n" +
        "- Any learnings or errors discovered\n\n" +
        JSON.stringify(old, null, 2),
    },
  ]);

  const compacted: Message[] = [
    { role: "user", content: `[Previous conversation summary]\n${summaryText}` },
    ...recent,
  ];

  sessions.set(sessionId, compacted);
  return compacted;
}
