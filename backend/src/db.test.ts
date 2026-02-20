import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { join } from "path";
import { mkdirSync, rmSync } from "fs";
import { tmpdir } from "os";
import { initDatabase, createDbOperations, type Agent } from "./db.js";
import type Database from "better-sqlite3";

const TEST_DB_DIR = join(
  tmpdir(),
  `skillsseal-test-${Date.now()}-${Math.random().toString(36).slice(2)}`
);

let testDb: Database.Database;
let ops: ReturnType<typeof createDbOperations>;

beforeEach(() => {
  mkdirSync(TEST_DB_DIR, { recursive: true });
  testDb = initDatabase(join(TEST_DB_DIR, "test.db"));
  ops = createDbOperations(testDb);
});

afterEach(() => {
  testDb.close();
  rmSync(TEST_DB_DIR, { recursive: true, force: true });
});

describe("db", () => {
  describe("ensureUser", () => {
    it("should create a new user", () => {
      ops.ensureUser("0xABC123");

      const user = testDb.prepare("SELECT * FROM users WHERE address = ?").get("0xabc123");
      expect(user).toBeDefined();
    });

    it("should normalize address to lowercase", () => {
      ops.ensureUser("0xABC123DEF456");

      const user = testDb.prepare("SELECT * FROM users WHERE address = ?").get("0xabc123def456");
      expect(user).toBeDefined();
    });

    it("should not duplicate users on multiple calls", () => {
      ops.ensureUser("0xabc123");
      ops.ensureUser("0xabc123");
      ops.ensureUser("0xABC123"); // Different case

      const count = testDb.prepare("SELECT COUNT(*) as count FROM users").get() as {
        count: number;
      };
      expect(count.count).toBe(1);
    });
  });

  describe("createAgent", () => {
    it("should create an agent and return its id", () => {
      ops.ensureUser("0xabc123");
      const id = ops.createAgent("0xabc123", "my-agent");

      expect(id).toBeGreaterThan(0);
    });

    it("should set default status to deploying", () => {
      ops.ensureUser("0xabc123");
      const id = ops.createAgent("0xabc123", "my-agent");

      const agent = ops.getAgentById(id);
      expect(agent?.status).toBe("deploying");
    });

    it("should normalize user address to lowercase", () => {
      ops.ensureUser("0xabc123");
      const id = ops.createAgent("0xABC123", "my-agent");

      const agent = ops.getAgentById(id);
      expect(agent?.user_address).toBe("0xabc123");
    });
  });

  describe("updateAgent", () => {
    it("should update specified fields", () => {
      ops.ensureUser("0xabc123");
      const id = ops.createAgent("0xabc123", "my-agent");

      ops.updateAgent(id, { status: "running", instance_ip: "1.2.3.4" });

      const agent = ops.getAgentById(id);
      expect(agent?.status).toBe("running");
      expect(agent?.instance_ip).toBe("1.2.3.4");
    });

    it("should reject invalid column names", () => {
      ops.ensureUser("0xabc123");
      const id = ops.createAgent("0xabc123", "my-agent");

      expect(() => ops.updateAgent(id, { invalid_column: "value" } as never)).toThrow(
        "Invalid column name: invalid_column"
      );
    });

    it("should reject invalid status values", () => {
      ops.ensureUser("0xabc123");
      const id = ops.createAgent("0xabc123", "my-agent");

      expect(() => ops.updateAgent(id, { status: "invalid_status" } as never)).toThrow(
        "Invalid status value: invalid_status"
      );
    });

    it("should not modify updated_at if no fields provided", () => {
      ops.ensureUser("0xabc123");
      const id = ops.createAgent("0xabc123", "my-agent");

      const before = ops.getAgentById(id) as Agent;
      ops.updateAgent(id, {});
      const after = ops.getAgentById(id) as Agent;

      expect(before.updated_at).toBe(after.updated_at);
    });

    it("should update all allowed columns", () => {
      ops.ensureUser("0xabc123");
      const id = ops.createAgent("0xabc123", "my-agent");

      ops.updateAgent(id, {
        app_id: "app-123",
        ecloud_name: "test-app",
        wallet_address_eth: "0xwallet",
        wallet_address_sol: "solwallet",
        instance_ip: "10.0.0.1",
        status: "running",
        docker_digest: "sha256:abc",
      });

      const agent = ops.getAgentById(id);
      expect(agent?.app_id).toBe("app-123");
      expect(agent?.ecloud_name).toBe("test-app");
      expect(agent?.wallet_address_eth).toBe("0xwallet");
      expect(agent?.wallet_address_sol).toBe("solwallet");
      expect(agent?.instance_ip).toBe("10.0.0.1");
      expect(agent?.status).toBe("running");
      expect(agent?.docker_digest).toBe("sha256:abc");
    });
  });

  describe("getAgentByUser", () => {
    it("should return the most recent agent for a user", () => {
      ops.ensureUser("0xabc123");
      ops.createAgent("0xabc123", "first-agent");
      const secondId = ops.createAgent("0xabc123", "second-agent");

      const agent = ops.getAgentByUser("0xabc123");
      expect(agent?.id).toBe(secondId);
      expect(agent?.name).toBe("second-agent");
    });

    it("should return undefined if no agent exists", () => {
      ops.ensureUser("0xabc123");

      const agent = ops.getAgentByUser("0xabc123");
      expect(agent).toBeUndefined();
    });

    it("should normalize address to lowercase", () => {
      ops.ensureUser("0xabc123");
      ops.createAgent("0xabc123", "my-agent");

      const agent = ops.getAgentByUser("0xABC123");
      expect(agent?.name).toBe("my-agent");
    });
  });

  describe("getAgentById", () => {
    it("should return agent by id", () => {
      ops.ensureUser("0xabc123");
      const id = ops.createAgent("0xabc123", "my-agent");

      const agent = ops.getAgentById(id);
      expect(agent).toBeDefined();
      expect(agent?.id).toBe(id);
      expect(agent?.name).toBe("my-agent");
    });

    it("should return undefined for non-existent id", () => {
      const agent = ops.getAgentById(99999);
      expect(agent).toBeUndefined();
    });
  });

  describe("initDatabase", () => {
    it("should create tables on initialization", () => {
      const tables = testDb
        .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
        .all() as { name: string }[];

      const tableNames = tables.map((t) => t.name);
      expect(tableNames).toContain("users");
      expect(tableNames).toContain("agents");
    });

    it("should create index on agents.user_address", () => {
      const indexes = testDb
        .prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='agents'")
        .all() as { name: string }[];

      const indexNames = indexes.map((i) => i.name);
      expect(indexNames).toContain("idx_agents_user");
    });

    it("should enable foreign key enforcement", () => {
      const fkStatus = testDb.pragma("foreign_keys") as { foreign_keys: number }[];
      expect(fkStatus[0].foreign_keys).toBe(1);
    });

    it("should reject agents with non-existent user_address", () => {
      expect(() => ops.createAgent("0xnonexistent", "my-agent")).toThrow(/FOREIGN KEY constraint/);
    });
  });
});
