import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import { join } from "path";
import { mkdirSync, rmSync } from "fs";
import { tmpdir } from "os";

const TEST_DB_DIR = join(tmpdir(), `eigenskills-test-${Date.now()}`);

let db: Database.Database;

function createTestFunctions(testDb: Database.Database) {
  const ensureUser = (address: string) => {
    testDb.prepare("INSERT OR IGNORE INTO users (address) VALUES (?)").run(address.toLowerCase());
  };

  const createAgent = (userAddress: string, name: string): number => {
    const result = testDb
      .prepare("INSERT INTO agents (user_address, name) VALUES (?, ?)")
      .run(userAddress.toLowerCase(), name);
    return Number(result.lastInsertRowid);
  };

  const ALLOWED_AGENT_COLUMNS = new Set([
    "app_id",
    "ecloud_name",
    "wallet_address_eth",
    "wallet_address_sol",
    "instance_ip",
    "status",
    "docker_digest",
  ]);

  const updateAgent = (id: number, fields: Record<string, string | undefined>) => {
    const sets: string[] = [];
    const values: unknown[] = [];

    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        if (!ALLOWED_AGENT_COLUMNS.has(key)) {
          throw new Error(`Invalid column name: ${key}`);
        }
        sets.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (sets.length === 0) return;

    sets.push("updated_at = datetime('now')");
    values.push(id);

    testDb.prepare(`UPDATE agents SET ${sets.join(", ")} WHERE id = ?`).run(...values);
  };

  const getAgentByUser = (userAddress: string) => {
    return testDb
      .prepare("SELECT * FROM agents WHERE user_address = ? ORDER BY id DESC LIMIT 1")
      .get(userAddress.toLowerCase());
  };

  const getAgentById = (id: number) => {
    return testDb.prepare("SELECT * FROM agents WHERE id = ?").get(id);
  };

  return { ensureUser, createAgent, updateAgent, getAgentByUser, getAgentById };
}

beforeEach(() => {
  mkdirSync(TEST_DB_DIR, { recursive: true });
  db = new Database(join(TEST_DB_DIR, "test.db"));
  db.pragma("journal_mode = WAL");

  db.exec(`
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
      status TEXT DEFAULT 'deploying',
      docker_digest TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_agents_user ON agents(user_address);
  `);
});

afterEach(() => {
  db.close();
  rmSync(TEST_DB_DIR, { recursive: true, force: true });
});

describe("db", () => {
  describe("ensureUser", () => {
    it("should create a new user", () => {
      const { ensureUser } = createTestFunctions(db);
      ensureUser("0xABC123");

      const user = db.prepare("SELECT * FROM users WHERE address = ?").get("0xabc123");
      expect(user).toBeDefined();
    });

    it("should normalize address to lowercase", () => {
      const { ensureUser } = createTestFunctions(db);
      ensureUser("0xABC123DEF456");

      const user = db.prepare("SELECT * FROM users WHERE address = ?").get("0xabc123def456");
      expect(user).toBeDefined();
    });

    it("should not duplicate users", () => {
      const { ensureUser } = createTestFunctions(db);
      ensureUser("0xabc123");
      ensureUser("0xabc123");

      const count = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
      expect(count.count).toBe(1);
    });
  });

  describe("createAgent", () => {
    it("should create an agent and return its id", () => {
      const { ensureUser, createAgent } = createTestFunctions(db);
      ensureUser("0xabc123");
      const id = createAgent("0xabc123", "my-agent");

      expect(id).toBeGreaterThan(0);
    });

    it("should set default status to deploying", () => {
      const { ensureUser, createAgent, getAgentById } = createTestFunctions(db);
      ensureUser("0xabc123");
      const id = createAgent("0xabc123", "my-agent");

      const agent = getAgentById(id) as { status: string };
      expect(agent.status).toBe("deploying");
    });
  });

  describe("updateAgent", () => {
    it("should update specified fields", () => {
      const { ensureUser, createAgent, updateAgent, getAgentById } = createTestFunctions(db);
      ensureUser("0xabc123");
      const id = createAgent("0xabc123", "my-agent");

      updateAgent(id, { status: "running", instance_ip: "1.2.3.4" });

      const agent = getAgentById(id) as { status: string; instance_ip: string };
      expect(agent.status).toBe("running");
      expect(agent.instance_ip).toBe("1.2.3.4");
    });

    it("should reject invalid column names", () => {
      const { ensureUser, createAgent, updateAgent } = createTestFunctions(db);
      ensureUser("0xabc123");
      const id = createAgent("0xabc123", "my-agent");

      expect(() => updateAgent(id, { invalid_column: "value" })).toThrow(
        "Invalid column name: invalid_column"
      );
    });

    it("should do nothing if no fields provided", () => {
      const { ensureUser, createAgent, updateAgent, getAgentById } = createTestFunctions(db);
      ensureUser("0xabc123");
      const id = createAgent("0xabc123", "my-agent");

      const before = getAgentById(id) as { updated_at: string };
      updateAgent(id, {});
      const after = getAgentById(id) as { updated_at: string };

      expect(before.updated_at).toBe(after.updated_at);
    });
  });

  describe("getAgentByUser", () => {
    it("should return the most recent agent for a user", () => {
      const { ensureUser, createAgent, getAgentByUser } = createTestFunctions(db);
      ensureUser("0xabc123");
      createAgent("0xabc123", "first-agent");
      const secondId = createAgent("0xabc123", "second-agent");

      const agent = getAgentByUser("0xabc123") as { id: number; name: string };
      expect(agent.id).toBe(secondId);
      expect(agent.name).toBe("second-agent");
    });

    it("should return undefined if no agent exists", () => {
      const { ensureUser, getAgentByUser } = createTestFunctions(db);
      ensureUser("0xabc123");

      const agent = getAgentByUser("0xabc123");
      expect(agent).toBeUndefined();
    });

    it("should normalize address to lowercase", () => {
      const { ensureUser, createAgent, getAgentByUser } = createTestFunctions(db);
      ensureUser("0xabc123");
      createAgent("0xabc123", "my-agent");

      const agent = getAgentByUser("0xABC123") as { name: string };
      expect(agent.name).toBe("my-agent");
    });
  });
});
