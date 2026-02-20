/**
 * PayToll Client Helper
 *
 * Provides a simple async interface for skill scripts to make x402 requests
 * via the TEE bridge. Uses fd3 for IPC, keeping stdout clean for normal output.
 *
 * Usage:
 *   import { x402Request, getSessionSpending } from './paytoll-client.js';
 *
 *   const result = await x402Request(
 *     'https://api.paytoll.org/v1/agents?query=image',
 *     'GET'
 *   );
 *
 *   if (result.error) {
 *     console.error(`Failed: ${result.message}`);
 *   } else {
 *     console.log(`Found ${result.body.agents.length} agents`);
 *   }
 */

import { createReadStream, createWriteStream } from "fs";
import { createInterface } from "readline";

// ── fd3 Setup ──────────────────────────────────────────────────────────────
//
// fd3 is passed by the executor as the IPC channel. Node's spawn creates it
// with stdio: ['pipe', 'pipe', 'pipe', 'pipe'] — the fourth element is fd3.
//
// We use createReadStream/createWriteStream with fd: 3 to access it.
// If fd3 is not available (e.g., running outside executor), we fall back
// to a no-op mode that returns errors.

let fd3Out = null;
let fd3In = null;
let rl = null;
let fd3Available = false;

try {
  fd3Out = createWriteStream(null, { fd: 3 });
  fd3In = createReadStream(null, { fd: 3 });
  rl = createInterface({ input: fd3In });
  fd3Available = true;

  // Handle stream errors gracefully
  fd3Out.on("error", () => {
    fd3Available = false;
  });
  fd3In.on("error", () => {
    fd3Available = false;
  });
} catch {
  // fd3 not available — running outside executor context
  fd3Available = false;
}

// ── Request/Response Tracking ──────────────────────────────────────────────

let requestId = 0;
const pendingRequests = new Map();

// Handle responses from the TEE bridge
if (rl) {
  rl.on("line", (line) => {
    try {
      const response = JSON.parse(line);
      const id = response.id;

      if (id !== undefined && pendingRequests.has(id)) {
        const { resolve } = pendingRequests.get(id);
        pendingRequests.delete(id);
        resolve(response);
      } else {
        // Response without ID or unknown ID — log but don't crash
        console.error("[paytoll-client] Received response with unknown ID:", id);
      }
    } catch (err) {
      console.error("[paytoll-client] Failed to parse IPC response:", err.message);
    }
  });

  rl.on("close", () => {
    // Bridge closed — reject all pending requests
    for (const [id, { reject }] of pendingRequests) {
      reject(new Error("IPC channel closed"));
      pendingRequests.delete(id);
    }
  });
}

// ── Main API ───────────────────────────────────────────────────────────────

/**
 * Make an x402 request via the TEE bridge.
 *
 * The bridge handles everything:
 * - Makes HTTP request to PayToll
 * - Handles 402 Payment Required (signs and retries)
 * - Enforces budget limits
 * - Records payment receipts
 *
 * @param {string} url - PayToll API URL
 * @param {string} [method='GET'] - HTTP method
 * @param {object} [body=null] - Request body (for POST/PUT)
 * @param {string} [taskId=null] - Associated task ID (for budget tracking)
 * @param {object} [options={}] - Additional options (headers, timeout)
 * @returns {Promise<object>} Response or error object
 *
 * Success response:
 *   { status: 200, body: {...}, paymentMade: true, paymentAmount: "0.001" }
 *
 * Error response:
 *   { error: "INSUFFICIENT_USDC", message: "Need 1.00 USDC, have 0.50",
 *     recoverable: false, suggestedAction: "Fund wallet on Base" }
 */
export async function x402Request(url, method = "GET", body = null, taskId = null, options = {}) {
  // Check if fd3 is available
  if (!fd3Available || !fd3Out) {
    return {
      error: "IPC_UNAVAILABLE",
      message: "fd3 IPC channel not available — running outside TEE executor context",
      recoverable: false,
      suggestedAction: "Run this script via the EigenSkills executor",
    };
  }

  const id = ++requestId;
  const timeout = options.timeout || 30000;

  return new Promise((resolve, reject) => {
    // Store pending request
    pendingRequests.set(id, { resolve, reject });

    // Set timeout
    const timer = setTimeout(() => {
      if (pendingRequests.has(id)) {
        pendingRequests.delete(id);
        resolve({
          error: "TIMEOUT",
          message: `TEE bridge did not respond within ${timeout}ms`,
          recoverable: true,
          suggestedAction: "Retry the request",
        });
      }
    }, timeout);

    // Clear timeout when resolved
    const originalResolve = resolve;
    resolve = (value) => {
      clearTimeout(timer);
      originalResolve(value);
    };

    // Send request to TEE bridge via fd3
    const request = {
      action: "x402_request",
      id,
      url,
      method,
      body,
      taskId,
    };

    if (options.headers) {
      request.headers = options.headers;
    }

    try {
      fd3Out.write(JSON.stringify(request) + "\n");
    } catch (err) {
      pendingRequests.delete(id);
      clearTimeout(timer);
      resolve({
        error: "IPC_ERROR",
        message: `Failed to write to fd3: ${err.message}`,
        recoverable: false,
      });
    }
  });
}

/**
 * Check if the TEE bridge is available.
 *
 * @returns {boolean} True if fd3 IPC is available
 */
export function isBridgeAvailable() {
  return fd3Available;
}

/**
 * Request current session spending from the bridge.
 *
 * @returns {Promise<object>} Session spending data or error
 */
export async function getSessionSpending() {
  if (!fd3Available || !fd3Out) {
    return {
      error: "IPC_UNAVAILABLE",
      message: "fd3 IPC channel not available",
      recoverable: false,
    };
  }

  const id = ++requestId;

  return new Promise((resolve) => {
    pendingRequests.set(id, { resolve, reject: resolve });

    const timer = setTimeout(() => {
      if (pendingRequests.has(id)) {
        pendingRequests.delete(id);
        resolve({
          error: "TIMEOUT",
          message: "TEE bridge did not respond",
          recoverable: true,
        });
      }
    }, 5000);

    const originalResolve = resolve;
    resolve = (value) => {
      clearTimeout(timer);
      originalResolve(value);
    };

    fd3Out.write(
      JSON.stringify({
        action: "get_session_spending",
        id,
      }) + "\n"
    );
  });
}

/**
 * Helper to check if a response is an error.
 *
 * @param {object} response - Response from x402Request
 * @returns {boolean} True if the response indicates an error
 */
export function isError(response) {
  return response && typeof response.error === "string";
}

/**
 * Helper to check if an error is recoverable.
 *
 * @param {object} response - Error response from x402Request
 * @returns {boolean} True if the error is recoverable (can retry)
 */
export function isRecoverable(response) {
  return response && response.recoverable === true;
}

// ── Convenience Methods ────────────────────────────────────────────────────

/**
 * GET request helper.
 */
export function get(url, taskId = null, options = {}) {
  return x402Request(url, "GET", null, taskId, options);
}

/**
 * POST request helper.
 */
export function post(url, body, taskId = null, options = {}) {
  return x402Request(url, "POST", body, taskId, options);
}

// ── PayToll API Helpers ────────────────────────────────────────────────────
// Pre-built helpers for common PayToll endpoints

const PAYTOLL_BASE = "https://api.paytoll.org";

/**
 * Search for agents by capability.
 *
 * @param {string} query - Capability to search for
 * @param {object} [options] - Search options (minRating, maxPrice, limit)
 */
export async function searchAgents(query, options = {}) {
  const params = new URLSearchParams({ query });
  if (options.minRating) params.set("min_rating", options.minRating);
  if (options.maxPrice) params.set("max_price", options.maxPrice);
  if (options.limit) params.set("limit", options.limit);

  return get(`${PAYTOLL_BASE}/v1/agents?${params}`);
}

/**
 * Get agent profile by ID.
 */
export async function getAgentProfile(agentId) {
  return get(`${PAYTOLL_BASE}/v1/agents/${agentId}`);
}

/**
 * Create a new task.
 */
export async function createTask(agentId, description, budget, options = {}) {
  return post(`${PAYTOLL_BASE}/v1/tasks`, {
    agent_id: agentId,
    description,
    budget: {
      amount: budget,
      currency: "USDC",
      chain: "base",
    },
    timeout_seconds: options.timeout || 3600,
    callback_url: options.callbackUrl,
  });
}

/**
 * Fund task escrow.
 */
export async function fundEscrow(taskId, amount) {
  return post(`${PAYTOLL_BASE}/v1/tasks/${taskId}/fund`, { amount }, taskId);
}

/**
 * Get task status.
 */
export async function getTaskStatus(taskId) {
  return get(`${PAYTOLL_BASE}/v1/tasks/${taskId}/status`, taskId);
}

/**
 * Get task result.
 */
export async function getTaskResult(taskId) {
  return get(`${PAYTOLL_BASE}/v1/tasks/${taskId}/result`, taskId);
}

/**
 * Cancel task.
 */
export async function cancelTask(taskId, reason = null) {
  return post(`${PAYTOLL_BASE}/v1/tasks/${taskId}/cancel`, { reason }, taskId);
}

/**
 * Rate agent after task completion.
 */
export async function rateAgent(agentId, taskId, rating, comment = null) {
  return post(`${PAYTOLL_BASE}/v1/agents/${agentId}/rate`, {
    task_id: taskId,
    rating,
    comment,
  });
}
