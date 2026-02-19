import { addLogEntry } from "./logger.js";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:3002";

interface HeartbeatTask {
  name: string;
  intervalMs: number;
  fn: () => Promise<void>;
}

const tasks: HeartbeatTask[] = [];
const timers: ReturnType<typeof setInterval>[] = [];

/** Register a recurring heartbeat task. */
export function registerHeartbeat(
  name: string,
  intervalMs: number,
  fn: () => Promise<void>
): void {
  tasks.push({ name, intervalMs, fn });
}

/** Start all registered heartbeat tasks. */
export function startHeartbeats(): void {
  for (const task of tasks) {
    console.log(`Heartbeat registered: ${task.name} (every ${task.intervalMs / 1000}s)`);
    const timer = setInterval(async () => {
      try {
        await task.fn();
        await addLogEntry("heartbeat_completed", { name: task.name });
      } catch (err) {
        console.error(`Heartbeat "${task.name}" failed:`, err);
        await addLogEntry("heartbeat_failed", {
          name: task.name,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }, task.intervalMs);
    timers.push(timer);
  }
}

/** Stop all heartbeat timers. */
export function stopHeartbeats(): void {
  for (const timer of timers) clearInterval(timer);
  timers.length = 0;
}

// ── Built-in heartbeat: Learning review ────────────────────────────────────

const LEARNING_REVIEW_INTERVAL = 6 * 60 * 60 * 1000; // 6 hours

async function reviewPendingLearnings(): Promise<void> {
  let entries: Array<{ entry_id: string; summary: string; entry_type: string }> = [];

  try {
    const res = await fetch(`${BACKEND_URL}/api/agents/learnings?status=pending`, {
      headers: { "Content-Type": "application/json" },
    });
    if (res.ok) {
      const data = (await res.json()) as { entries: typeof entries };
      entries = data.entries ?? [];
    }
  } catch {
    return;
  }

  if (entries.length === 0) return;

  const summary = entries
    .slice(0, 10)
    .map((e) => `- [${e.entry_type}] ${e.summary}`)
    .join("\n");

  const message = `*Learning Review*\n${entries.length} pending learnings:\n\n${summary}`;

  await addLogEntry("learning_review", { count: entries.length });

  // Push notification to Telegram if linked
  try {
    await fetch(`${BACKEND_URL}/api/heartbeat/notify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
  } catch {
    // Telegram notification is best-effort
  }
}

/** Register default heartbeat tasks. Call after other init. */
export function registerDefaultHeartbeats(): void {
  registerHeartbeat("learning-review", LEARNING_REVIEW_INTERVAL, reviewPendingLearnings);
}
