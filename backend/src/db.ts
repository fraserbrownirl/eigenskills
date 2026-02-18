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
    // Only ignore "duplicate column" errors
    const message = err instanceof Error ? err.message : String(err);
    if (!message.includes("duplicate column")) {
      throw err;
    }
  }

  return db;
}

// Production database singleton
const DB_DIR = join(__dirname, "..", "data");
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
}>;

const ALLOWED_AGENT_COLUMNS = new Set([
  "app_id",
  "ecloud_name",
  "wallet_address_eth",
  "wallet_address_sol",
  "instance_ip",
  "status",
  "docker_digest",
]);

export interface DbOperations {
  ensureUser(address: string): void;
  createAgent(userAddress: string, name: string): number;
  updateAgent(id: number, fields: AgentUpdateFields): void;
  getAgentByUser(userAddress: string): Agent | undefined;
  getAgentById(id: number): Agent | undefined;
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
  };
}

// Production functions using the singleton database
const ops = createDbOperations(db);

export const ensureUser = ops.ensureUser;
export const createAgent = ops.createAgent;
export const updateAgent = ops.updateAgent;
export const getAgentByUser = ops.getAgentByUser;
export const getAgentById = ops.getAgentById;

export default db;
