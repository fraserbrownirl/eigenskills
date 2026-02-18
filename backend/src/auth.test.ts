import { describe, it, expect } from "vitest";
import { generateNonce, createSessionToken } from "./auth.js";

describe("auth", () => {
  describe("generateNonce", () => {
    it("should generate a 32-character hex string", () => {
      const nonce = generateNonce();
      expect(nonce).toMatch(/^[a-f0-9]{32}$/);
    });

    it("should generate unique nonces", () => {
      const nonces = new Set<string>();
      for (let i = 0; i < 100; i++) {
        nonces.add(generateNonce());
      }
      expect(nonces.size).toBe(100);
    });
  });

  describe("createSessionToken", () => {
    it("should create a base64 encoded token", () => {
      const token = createSessionToken("0xabc123");
      expect(() => Buffer.from(token, "base64")).not.toThrow();
    });

    it("should encode the address in lowercase", () => {
      const token = createSessionToken("0xABC123");
      const decoded = Buffer.from(token, "base64").toString("utf-8");
      expect(decoded.startsWith("0xabc123:")).toBe(true);
    });

    it("should include an expiration timestamp", () => {
      const before = Date.now();
      const token = createSessionToken("0xabc123");
      const after = Date.now();

      const decoded = Buffer.from(token, "base64").toString("utf-8");
      const parts = decoded.split(":");
      const expiresAt = parseInt(parts[1], 10);

      const expectedMin = before + 24 * 60 * 60 * 1000;
      const expectedMax = after + 24 * 60 * 60 * 1000;

      expect(expiresAt).toBeGreaterThanOrEqual(expectedMin);
      expect(expiresAt).toBeLessThanOrEqual(expectedMax);
    });

    it("should include an HMAC signature", () => {
      const token = createSessionToken("0xabc123");
      const decoded = Buffer.from(token, "base64").toString("utf-8");
      const parts = decoded.split(":");

      expect(parts.length).toBe(3);
      expect(parts[2]).toMatch(/^[a-f0-9]{64}$/);
    });
  });
});
