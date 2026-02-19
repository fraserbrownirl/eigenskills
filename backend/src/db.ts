import Database from "better-sqlite3";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { mkdirSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const VALID_AGENT_STATUSES = ["deploying", "running", "stopped", "terminated"] as const;
export type AgentStatus = (typeof VALID_AGENT_STATUSES)[number];

const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS users (
    address TEXT PRIMARY KEY,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS agents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_address TEXT NOT NULL REFERENCES users(address),
    app_id TEXT,
    ecloud_name TEXT,
    name TEXT NOT NULL,
    wallet_address_eth TEXT,
    wallet_address_sol TEXT,
    instance_ip TEXT,
    status TEXT DEFAULT 'deploying' CHECK (status IN ('deploying', 'running', 'stopped', 'terminated')),
    docker_digest TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_agents_user ON agents(user_address);

  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_address TEXT NOT NULL REFERENCES users(address),
    session_id TEXT NOT NULL,
    messages TEXT NOT NULL,
    signature TEXT NOT NULL,
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_address, session_id)
  );

  CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_address);

  CREATE TABLE IF NOT EXISTS memory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_address TEXT NOT NULL REFERENCES users(address),
    key TEXT NOT NULL,
    content TEXT NOT NULL,
    signature TEXT NOT NULL,
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_address, key)
  );

  CREATE INDEX IF NOT EXISTS idx_memory_user ON memory(user_address);

  CREATE TABLE IF NOT EXISTS learnings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_address TEXT NOT NULL REFERENCES users(address),
    entry_id TEXT NOT NULL UNIQUE,
    entry_type TEXT NOT NULL,
    category TEXT,
    summary TEXT NOT NULL,
    content TEXT NOT NULL,
    priority TEXT DEFAULT 'medium',
    status TEXT DEFAULT 'pending',
    promoted_to TEXT,
    area TEXT,
    signature TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_learnings_user ON learnings(user_address);
  CREATE INDEX IF NOT EXISTS idx_learnings_status ON learnings(user_address, status);

  CREATE TABLE IF NOT EXISTS telegram_links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_address TEXT NOT NULL UNIQUE REFERENCES users(address),
    telegram_chat_id TEXT UNIQUE,
    link_code TEXT,
    linked_at TEXT DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_telegram_chat ON telegram_links(telegram_chat_id);
  CREATE INDEX IF NOT EXISTS idx_telegram_user ON telegram_links(user_address);

  CREATE TABLE IF NOT EXISTS workspace_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_address TEXT NOT NULL REFERENCES users(address),
    filename TEXT NOT NULL,
    content TEXT NOT NULL,
    signature TEXT NOT NULL,
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_address, filename)
  );

  CREATE TABLE IF NOT EXISTS pending_deploys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dispatch_id TEXT NOT NULL UNIQUE,
    user_address TEXT NOT NULL REFERENCES users(address),
    agent_id INTEGER REFERENCES agents(id),
    action TEXT NOT NULL CHECK (action IN ('deploy', 'upgrade')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'error')),
    error_message TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    completed_at TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_pending_deploys_dispatch ON pending_deploys(dispatch_id);
  CREATE INDEX IF NOT EXISTS idx_pending_deploys_user ON pending_deploys(user_address);
`;

/**
 * Initialize and configure a database instance.
 * Exported for testing — production code should use the default export.
 */
export function initDatabase(dbPath: string): Database.Database {
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA_SQL);

  // Migration: add ecloud_name column if it doesn't exist (for existing DBs)
  try {
    db.exec(`ALTER TABLE agents ADD COLUMN ecloud_name TEXT`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (!message.includes("duplicate column")) {
      throw err;
    }
  }

  // Migration: add env_vars column (encrypted at rest)
  try {
    db.exec(`ALTER TABLE agents ADD COLUMN env_vars TEXT`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (!message.includes("duplicate column")) {
      throw err;
    }
  }

  return db;
}

// Production database singleton (DB_DIR for Railway/volume mount)
const DB_DIR = process.env.DB_DIR ?? join(__dirname, "..", "data");
mkdirSync(DB_DIR, { recursive: true });
const db = initDatabase(join(DB_DIR, "eigenskills.db"));

export interface Agent {
  id: number;
  user_address: string;
  app_id: string | null;
  ecloud_name: string | null;
  name: string;
  wallet_address_eth: string | null;
  wallet_address_sol: string | null;
  instance_ip: string | null;
  status: AgentStatus;
  docker_digest: string | null;
  env_vars: string | null;
  created_at: string;
  updated_at: string;
}

export type AgentUpdateFields = Partial<{
  app_id: string;
  ecloud_name: string;
  wallet_address_eth: string;
  wallet_address_sol: string;
  instance_ip: string;
  status: AgentStatus;
  docker_digest: string;
  env_vars: string;
}>;

const ALLOWED_AGENT_COLUMNS = new Set([
  "app_id",
  "ecloud_name",
  "wallet_address_eth",
  "wallet_address_sol",
  "instance_ip",
  "status",
  "docker_digest",
  "env_vars",
]);

export interface SessionRow {
  id: number;
  user_address: string;
  session_id: string;
  messages: string;
  signature: string;
  updated_at: string;
}

export interface SessionSummary {
  session_id: string;
  updated_at: string;
  message_count: number;
}

export interface MemoryRow {
  id: number;
  user_address: string;
  key: string;
  content: string;
  signature: string;
  updated_at: string;
}

export interface LearningRow {
  id: number;
  user_address: string;
  entry_id: string;
  entry_type: string;
  category: string | null;
  summary: string;
  content: string;
  priority: string;
  status: string;
  promoted_to: string | null;
  area: string | null;
  signature: string;
  created_at: string;
}

export interface WorkspaceFileRow {
  id: number;
  user_address: string;
  filename: string;
  content: string;
  signature: string;
  updated_at: string;
}

export interface TelegramLinkRow {
  id: number;
  user_address: string;
  telegram_chat_id: string;
  link_code: string | null;
  linked_at: string;
}

export interface PendingDeployRow {
  id: number;
  dispatch_id: string;
  user_address: string;
  agent_id: number | null;
  action: "deploy" | "upgrade";
  status: "pending" | "success" | "error";
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface DbOperations {
  ensureUser(address: string): void;
  createAgent(userAddress: string, name: string): number;
  updateAgent(id: number, fields: AgentUpdateFields): void;
  getAgentByUser(userAddress: string): Agent | undefined;
  getAgentById(id: number): Agent | undefined;
  saveSession(userAddress: string, sessionId: string, messages: string, signature: string): void;
  loadSession(userAddress: string, sessionId: string): SessionRow | undefined;
  listSessions(userAddress: string): SessionSummary[];
  deleteSession(userAddress: string, sessionId: string): boolean;
  saveMemory(userAddress: string, key: string, content: string, signature: string): void;
  getMemory(userAddress: string, key: string): MemoryRow | undefined;
  listMemory(userAddress: string): MemoryRow[];
  searchMemory(userAddress: string, query: string): MemoryRow[];
  deleteMemory(userAddress: string, key: string): boolean;
  createLearning(
    userAddress: string,
    entry: {
      entryId: string;
      entryType: string;
      category?: string;
      summary: string;
      content: string;
      priority?: string;
      area?: string;
      signature: string;
    }
  ): void;
  listLearnings(
    userAddress: string,
    filters?: { status?: string; entryType?: string }
  ): LearningRow[];
  searchLearnings(userAddress: string, query: string): LearningRow[];
  updateLearningStatus(entryId: string, status: string, promotedTo?: string): boolean;
  saveWorkspaceFile(
    userAddress: string,
    filename: string,
    content: string,
    signature: string
  ): void;
  getWorkspaceFile(userAddress: string, filename: string): WorkspaceFileRow | undefined;
  listWorkspaceFiles(userAddress: string): WorkspaceFileRow[];
  createTelegramLinkCode(userAddress: string, code: string): void;
  completeTelegramLink(code: string, chatId: string): string | null;
  getTelegramLink(chatId: string): TelegramLinkRow | undefined;
  getTelegramLinkByUser(userAddress: string): TelegramLinkRow | undefined;
  unlinkTelegram(userAddress: string): boolean;
}

/**
 * Create database operations bound to a specific database instance.
 * Exported for testing — production code should use the standalone functions.
 */
export function createDbOperations(database: Database.Database): DbOperations {
  return {
    ensureUser(address: string): void {
      database
        .prepare("INSERT OR IGNORE INTO users (address) VALUES (?)")
        .run(address.toLowerCase());
    },

    createAgent(userAddress: string, name: string): number {
      const result = database
        .prepare("INSERT INTO agents (user_address, name) VALUES (?, ?)")
        .run(userAddress.toLowerCase(), name);
      return Number(result.lastInsertRowid);
    },

    updateAgent(id: number, fields: AgentUpdateFields): void {
      const sets: string[] = [];
      const values: unknown[] = [];

      for (const [key, value] of Object.entries(fields)) {
        if (value !== undefined) {
          if (!ALLOWED_AGENT_COLUMNS.has(key)) {
            throw new Error(`Invalid column name: ${key}`);
          }
          if (key === "status" && !VALID_AGENT_STATUSES.includes(value as AgentStatus)) {
            throw new Error(`Invalid status value: ${value}`);
          }
          sets.push(`${key} = ?`);
          values.push(value);
        }
      }

      if (sets.length === 0) return;

      sets.push("updated_at = datetime('now')");
      values.push(id);

      database.prepare(`UPDATE agents SET ${sets.join(", ")} WHERE id = ?`).run(...values);
    },

    getAgentByUser(userAddress: string): Agent | undefined {
      return database
        .prepare("SELECT * FROM agents WHERE user_address = ? ORDER BY id DESC LIMIT 1")
        .get(userAddress.toLowerCase()) as Agent | undefined;
    },

    getAgentById(id: number): Agent | undefined {
      return database.prepare("SELECT * FROM agents WHERE id = ?").get(id) as Agent | undefined;
    },

    saveSession(userAddress: string, sessionId: string, messages: string, signature: string): void {
      database
        .prepare(
          `INSERT INTO sessions (user_address, session_id, messages, signature, updated_at)
           VALUES (?, ?, ?, ?, datetime('now'))
           ON CONFLICT(user_address, session_id)
           DO UPDATE SET messages = excluded.messages, signature = excluded.signature, updated_at = datetime('now')`
        )
        .run(userAddress.toLowerCase(), sessionId, messages, signature);
    },

    loadSession(userAddress: string, sessionId: string): SessionRow | undefined {
      return database
        .prepare("SELECT * FROM sessions WHERE user_address = ? AND session_id = ?")
        .get(userAddress.toLowerCase(), sessionId) as SessionRow | undefined;
    },

    listSessions(userAddress: string): SessionSummary[] {
      const rows = database
        .prepare(
          `SELECT session_id, updated_at, messages FROM sessions
           WHERE user_address = ? ORDER BY updated_at DESC`
        )
        .all(userAddress.toLowerCase()) as SessionRow[];

      return rows.map((row) => {
        let messageCount = 0;
        try {
          messageCount = (JSON.parse(row.messages) as unknown[]).length;
        } catch {
          /* empty or malformed */
        }
        return {
          session_id: row.session_id,
          updated_at: row.updated_at,
          message_count: messageCount,
        };
      });
    },

    deleteSession(userAddress: string, sessionId: string): boolean {
      const result = database
        .prepare("DELETE FROM sessions WHERE user_address = ? AND session_id = ?")
        .run(userAddress.toLowerCase(), sessionId);
      return result.changes > 0;
    },

    saveMemory(userAddress: string, key: string, content: string, signature: string): void {
      database
        .prepare(
          `INSERT INTO memory (user_address, key, content, signature, updated_at)
           VALUES (?, ?, ?, ?, datetime('now'))
           ON CONFLICT(user_address, key)
           DO UPDATE SET content = excluded.content, signature = excluded.signature, updated_at = datetime('now')`
        )
        .run(userAddress.toLowerCase(), key, content, signature);
    },

    getMemory(userAddress: string, key: string): MemoryRow | undefined {
      return database
        .prepare("SELECT * FROM memory WHERE user_address = ? AND key = ?")
        .get(userAddress.toLowerCase(), key) as MemoryRow | undefined;
    },

    listMemory(userAddress: string): MemoryRow[] {
      return database
        .prepare("SELECT * FROM memory WHERE user_address = ? ORDER BY updated_at DESC")
        .all(userAddress.toLowerCase()) as MemoryRow[];
    },

    searchMemory(userAddress: string, query: string): MemoryRow[] {
      const words = query.toLowerCase().split(/\s+/).filter(Boolean);
      if (words.length === 0) return [];
      const allRows = database
        .prepare("SELECT * FROM memory WHERE user_address = ? ORDER BY updated_at DESC")
        .all(userAddress.toLowerCase()) as MemoryRow[];
      return allRows.filter((row) => {
        const text = `${row.key} ${row.content}`.toLowerCase();
        return words.some((w) => text.includes(w));
      });
    },

    deleteMemory(userAddress: string, key: string): boolean {
      const result = database
        .prepare("DELETE FROM memory WHERE user_address = ? AND key = ?")
        .run(userAddress.toLowerCase(), key);
      return result.changes > 0;
    },

    createLearning(
      userAddress: string,
      entry: {
        entryId: string;
        entryType: string;
        category?: string;
        summary: string;
        content: string;
        priority?: string;
        area?: string;
        signature: string;
      }
    ): void {
      database
        .prepare(
          `INSERT INTO learnings (user_address, entry_id, entry_type, category, summary, content, priority, area, signature)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          userAddress.toLowerCase(),
          entry.entryId,
          entry.entryType,
          entry.category ?? null,
          entry.summary,
          entry.content,
          entry.priority ?? "medium",
          entry.area ?? null,
          entry.signature
        );
    },

    listLearnings(
      userAddress: string,
      filters?: { status?: string; entryType?: string }
    ): LearningRow[] {
      let sql = "SELECT * FROM learnings WHERE user_address = ?";
      const params: unknown[] = [userAddress.toLowerCase()];
      if (filters?.status) {
        sql += " AND status = ?";
        params.push(filters.status);
      }
      if (filters?.entryType) {
        sql += " AND entry_type = ?";
        params.push(filters.entryType);
      }
      sql += " ORDER BY created_at DESC";
      return database.prepare(sql).all(...params) as LearningRow[];
    },

    searchLearnings(userAddress: string, query: string): LearningRow[] {
      const words = query.toLowerCase().split(/\s+/).filter(Boolean);
      if (words.length === 0) return [];
      const allRows = database
        .prepare("SELECT * FROM learnings WHERE user_address = ? ORDER BY created_at DESC")
        .all(userAddress.toLowerCase()) as LearningRow[];
      return allRows.filter((row) => {
        const text =
          `${row.entry_id} ${row.summary} ${row.content} ${row.category ?? ""}`.toLowerCase();
        return words.some((w) => text.includes(w));
      });
    },

    updateLearningStatus(entryId: string, status: string, promotedTo?: string): boolean {
      const result = database
        .prepare(
          "UPDATE learnings SET status = ?, promoted_to = COALESCE(?, promoted_to) WHERE entry_id = ?"
        )
        .run(status, promotedTo ?? null, entryId);
      return result.changes > 0;
    },

    saveWorkspaceFile(
      userAddress: string,
      filename: string,
      content: string,
      signature: string
    ): void {
      database
        .prepare(
          `INSERT INTO workspace_files (user_address, filename, content, signature, updated_at)
           VALUES (?, ?, ?, ?, datetime('now'))
           ON CONFLICT(user_address, filename)
           DO UPDATE SET content = excluded.content, signature = excluded.signature, updated_at = datetime('now')`
        )
        .run(userAddress.toLowerCase(), filename, content, signature);
    },

    getWorkspaceFile(userAddress: string, filename: string): WorkspaceFileRow | undefined {
      return database
        .prepare("SELECT * FROM workspace_files WHERE user_address = ? AND filename = ?")
        .get(userAddress.toLowerCase(), filename) as WorkspaceFileRow | undefined;
    },

    listWorkspaceFiles(userAddress: string): WorkspaceFileRow[] {
      return database
        .prepare("SELECT * FROM workspace_files WHERE user_address = ? ORDER BY filename")
        .all(userAddress.toLowerCase()) as WorkspaceFileRow[];
    },

    createTelegramLinkCode(userAddress: string, code: string): void {
      database
        .prepare(
          `INSERT INTO telegram_links (user_address, link_code) VALUES (?, ?)
           ON CONFLICT(user_address) DO UPDATE SET link_code = excluded.link_code`
        )
        .run(userAddress.toLowerCase(), code);
    },

    completeTelegramLink(code: string, chatId: string): string | null {
      const row = database
        .prepare("SELECT user_address FROM telegram_links WHERE link_code = ?")
        .get(code) as { user_address: string } | undefined;

      if (!row) return null;

      database
        .prepare(
          "UPDATE telegram_links SET telegram_chat_id = ?, link_code = NULL, linked_at = datetime('now') WHERE link_code = ?"
        )
        .run(chatId, code);

      return row.user_address;
    },

    getTelegramLink(chatId: string): TelegramLinkRow | undefined {
      return database
        .prepare("SELECT * FROM telegram_links WHERE telegram_chat_id = ?")
        .get(chatId) as TelegramLinkRow | undefined;
    },

    getTelegramLinkByUser(userAddress: string): TelegramLinkRow | undefined {
      return database
        .prepare("SELECT * FROM telegram_links WHERE user_address = ?")
        .get(userAddress.toLowerCase()) as TelegramLinkRow | undefined;
    },

    unlinkTelegram(userAddress: string): boolean {
      const result = database
        .prepare("DELETE FROM telegram_links WHERE user_address = ?")
        .run(userAddress.toLowerCase());
      return result.changes > 0;
    },

    createPendingDeploy(
      dispatchId: string,
      userAddress: string,
      agentId: number | null,
      action: "deploy" | "upgrade"
    ): void {
      database
        .prepare(
          `INSERT INTO pending_deploys (dispatch_id, user_address, agent_id, action)
           VALUES (?, ?, ?, ?)`
        )
        .run(dispatchId, userAddress.toLowerCase(), agentId, action);
    },

    getPendingDeploy(dispatchId: string): PendingDeployRow | undefined {
      return database
        .prepare("SELECT * FROM pending_deploys WHERE dispatch_id = ?")
        .get(dispatchId) as PendingDeployRow | undefined;
    },

    getPendingDeployByUser(userAddress: string): PendingDeployRow | undefined {
      return database
        .prepare(
          "SELECT * FROM pending_deploys WHERE user_address = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 1"
        )
        .get(userAddress.toLowerCase()) as PendingDeployRow | undefined;
    },

    completePendingDeploy(
      dispatchId: string,
      status: "success" | "error",
      errorMessage?: string
    ): boolean {
      const result = database
        .prepare(
          `UPDATE pending_deploys 
           SET status = ?, error_message = ?, completed_at = datetime('now')
           WHERE dispatch_id = ?`
        )
        .run(status, errorMessage ?? null, dispatchId);
      return result.changes > 0;
    },
  };
}

// Production functions using the singleton database
const ops = createDbOperations(db);

export const ensureUser = ops.ensureUser;
export const createAgent = ops.createAgent;
export const updateAgent = ops.updateAgent;
export const getAgentByUser = ops.getAgentByUser;
export const getAgentById = ops.getAgentById;
export const saveSession = ops.saveSession;
export const loadSession = ops.loadSession;
export const listSessions = ops.listSessions;
export const deleteSession = ops.deleteSession;
export const saveMemory = ops.saveMemory;
export const getMemory = ops.getMemory;
export const listMemory = ops.listMemory;
export const searchMemory = ops.searchMemory;
export const deleteMemory = ops.deleteMemory;
export const createLearning = ops.createLearning;
export const listLearnings = ops.listLearnings;
export const searchLearnings = ops.searchLearnings;
export const updateLearningStatus = ops.updateLearningStatus;
export const saveWorkspaceFile = ops.saveWorkspaceFile;
export const getWorkspaceFile = ops.getWorkspaceFile;
export const listWorkspaceFiles = ops.listWorkspaceFiles;
export const createTelegramLinkCode = ops.createTelegramLinkCode;
export const completeTelegramLink = ops.completeTelegramLink;
export const getTelegramLink = ops.getTelegramLink;
export const getTelegramLinkByUser = ops.getTelegramLinkByUser;
export const unlinkTelegram = ops.unlinkTelegram;
export const createPendingDeploy = ops.createPendingDeploy;
export const getPendingDeploy = ops.getPendingDeploy;
export const getPendingDeployByUser = ops.getPendingDeployByUser;
export const completePendingDeploy = ops.completePendingDeploy;

export default db;
