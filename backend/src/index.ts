import "dotenv/config";
import express, { type ErrorRequestHandler } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import {
  verifySiwe,
  createSessionToken,
  requireAuth,
  getUserAddress,
  generateNonce,
} from "./auth.js";
import {
  ensureUser,
  createAgent,
  updateAgent,
  getAgentByUser,
  saveSession,
  loadSession,
  listSessions,
  deleteSession,
  saveMemory,
  listMemory,
  searchMemory,
  deleteMemory,
  createLearning,
  listLearnings,
  searchLearnings,
  updateLearningStatus,
  saveWorkspaceFile,
  getWorkspaceFile,
  createTelegramLinkCode,
  getTelegramLinkByUser,
  unlinkTelegram,
  createPendingDeploy,
  getPendingDeploy,
  getPendingDeployByUser,
  completePendingDeploy,
  type MemoryRow,
  type PendingDeployRow,
} from "./db.js";
import { initTelegramBot, sendTelegramMessage } from "./telegram.js";
import {
  deployAgent,
  upgradeAgent,
  stopAgent,
  startAgent,
  terminateAgent,
  getAppInfo,
  getAppLogs,
  isAsyncDeployResult,
} from "./eigencompute.js";
import { createHmac, timingSafeEqual } from "crypto";
import { encryptEnvVars, decryptEnvVars } from "./envVarsEncrypt.js";

// Request validation schemas
const envVarSchema = z.object({
  key: z
    .string()
    .min(1)
    .regex(/^[A-Z][A-Z0-9_]*$/, "Key must be uppercase with underscores"),
  value: z.string(),
  isPublic: z.boolean(),
});

const deployRequestSchema = z.object({
  name: z.string().min(1).max(64),
  envVars: z.array(envVarSchema),
});

const upgradeRequestSchema = z.object({
  envVars: z.array(envVarSchema),
});

const taskRequestSchema = z.object({
  task: z.string().min(1),
});

const authVerifySchema = z.object({
  message: z.string().min(1),
  signature: z.string().min(1),
});

const sessionSaveSchema = z.object({
  sessionId: z.string().min(1).max(128),
  messages: z.array(z.record(z.unknown())),
  signature: z.string().min(1),
});

const memorySaveSchema = z.object({
  key: z.string().min(1).max(128),
  content: z.string().min(1),
  signature: z.string().min(1),
});

const learningCreateSchema = z.object({
  entryId: z.string().min(1).max(64),
  entryType: z.enum(["LRN", "ERR", "FEAT"]),
  category: z.string().optional(),
  summary: z.string().min(1),
  content: z.string().min(1),
  priority: z.enum(["low", "medium", "high", "critical"]).optional(),
  area: z.string().optional(),
  signature: z.string().min(1),
});

const learningUpdateSchema = z.object({
  status: z.string().min(1),
  promotedTo: z.string().optional(),
});

const workspaceFileSaveSchema = z.object({
  content: z.string(),
  signature: z.string().min(1),
});

// Grant env vars that must not be deleted by user (EigenAI auth)
const GRANT_VAR_KEYS = [
  "EIGENAI_GRANT_MESSAGE",
  "EIGENAI_GRANT_SIGNATURE",
  "EIGENAI_WALLET_ADDRESS",
] as const;

// Constants
const JSON_BODY_LIMIT = "50kb";
const AUTH_RATE_WINDOW_MS = 60 * 1000; // 1 minute
const AUTH_RATE_MAX = 10;
const DEPLOY_RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const DEPLOY_RATE_MAX = 3;
const AGENT_PORT = 3000;
const MAX_TASK_LENGTH = 10 * 1024; // 10KB
const DEFAULT_LOG_LINES = 100;

const app = express();
app.set("trust proxy", 1);
app.use(helmet());
app.use(express.json({ limit: JSON_BODY_LIMIT }));
app.use(
  cors({
    origin: process.env.FRONTEND_URL ?? "http://localhost:3000",
    credentials: true,
  })
);

const PORT = parseInt(process.env.PORT ?? "3002", 10);

// Rate limiters to prevent abuse
const authLimiter = rateLimit({
  windowMs: AUTH_RATE_WINDOW_MS,
  max: AUTH_RATE_MAX,
  message: { error: "Too many auth attempts, try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

const deployLimiter = rateLimit({
  windowMs: DEPLOY_RATE_WINDOW_MS,
  max: DEPLOY_RATE_MAX,
  message: { error: `Deploy limit reached (${DEPLOY_RATE_MAX}/hour), try again later` },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Helper to get the user's active agent, returning an error response if not available.
 * Returns the agent database row or null if an error response was sent.
 */
function getActiveAgentOrError(
  req: Parameters<typeof getUserAddress>[0],
  res: { status: (code: number) => { json: (body: unknown) => void } },
  requireRunning = true
): ReturnType<typeof getAgentByUser> | null {
  const userAddress = getUserAddress(req);
  const agent = getAgentByUser(userAddress);

  if (!agent) {
    res.status(404).json({ error: "No agent found" });
    return null;
  }

  if (requireRunning && agent.status !== "running") {
    res.status(404).json({ error: "No running agent found" });
    return null;
  }

  return agent;
}

/**
 * Proxy a GET request to the user's agent.
 */
async function proxyGetToAgent(
  req: Parameters<typeof getUserAddress>[0],
  res: {
    status: (code: number) => { json: (body: unknown) => void };
    json: (body: unknown) => void;
  },
  endpoint: string,
  errorContext: string
): Promise<void> {
  const agent = getActiveAgentOrError(req, res);
  if (!agent) return;

  if (!agent.instance_ip) {
    res.status(503).json({ error: "Agent instance IP not available yet" });
    return;
  }

  const agentUrl = `http://${agent.instance_ip}:${AGENT_PORT}${endpoint}`;
  const agentRes = await fetch(agentUrl);

  if (!agentRes.ok) {
    res.status(agentRes.status).json({ error: `Failed to fetch ${errorContext} from agent` });
    return;
  }

  const result = await agentRes.json();
  res.json(result);
}

/**
 * Format an error for API response, hiding internal details.
 */
function handleRouteError(
  res: { status: (code: number) => { json: (body: unknown) => void } },
  error: unknown,
  context: string
): void {
  console.error(`${context} error:`, error);
  res.status(500).json({ error: `${context} failed` });
}

const GRANT_API = process.env.EIGENAI_GRANT_API ?? "https://determinal-api.eigenarcade.com";

// GET /api/auth/nonce — get a server-issued nonce for SIWE
app.get("/api/auth/nonce", authLimiter, (_req, res) => {
  const nonce = generateNonce();
  res.json({ nonce });
});

// GET /api/auth/grant — proxy grant check to avoid CORS (browser → our backend → EigenArcade)
app.get("/api/auth/grant", authLimiter, async (req, res) => {
  const address = typeof req.query.address === "string" ? req.query.address.trim() : "";
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    res.status(400).json({ error: "Invalid or missing address" });
    return;
  }
  try {
    const grantRes = await fetch(`${GRANT_API}/checkGrant?address=${encodeURIComponent(address)}`);
    if (!grantRes.ok) {
      res.json({ hasGrant: false, tokenCount: 0 });
      return;
    }
    const data = (await grantRes.json()) as { hasGrant?: boolean; tokenCount?: number };
    res.json({
      hasGrant: data.hasGrant ?? false,
      tokenCount: data.tokenCount ?? 0,
    });
  } catch (err) {
    console.error("Grant check proxy error:", err);
    res.json({ hasGrant: false, tokenCount: 0 });
  }
});

// GET /api/auth/grant-message — proxy grant message fetch to avoid CORS
app.get("/api/auth/grant-message", authLimiter, async (req, res) => {
  const address = typeof req.query.address === "string" ? req.query.address.trim() : "";
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    res.status(400).json({ error: "Invalid or missing address" });
    return;
  }
  try {
    const msgRes = await fetch(`${GRANT_API}/message?address=${encodeURIComponent(address)}`);
    if (!msgRes.ok) {
      res.status(msgRes.status).json({ error: "Failed to fetch grant message" });
      return;
    }
    const data = await msgRes.json();
    res.json(data);
  } catch (err) {
    console.error("Grant message proxy error:", err);
    res.status(500).json({ error: "Failed to fetch grant message" });
  }
});

// POST /api/auth/verify — verify SIWE signature, return session token
app.post("/api/auth/verify", authLimiter, async (req, res) => {
  try {
    const parsed = authVerifySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Missing or invalid message/signature" });
      return;
    }

    const { message, signature } = parsed.data;
    const address = await verifySiwe(message, signature);
    ensureUser(address);

    const token = createSessionToken(address);
    const agent = getAgentByUser(address);

    // Only consider active (non-terminated) agents
    const hasActiveAgent = !!agent && agent.status !== "terminated";
    res.json({ address, token, hasAgent: hasActiveAgent });
  } catch (error) {
    console.error("SIWE verification error:", error);
    res.status(401).json({ error: "Invalid signature" });
  }
});

// POST /api/agents/deploy — deploy a new agent for the user
app.post("/api/agents/deploy", deployLimiter, requireAuth, async (req, res) => {
  let agentId: number | undefined;
  try {
    const userAddress = getUserAddress(req);
    const parsed = deployRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request: " + parsed.error.issues[0]?.message });
      return;
    }

    const { name, envVars } = parsed.data;

    // Ensure user exists in DB (handles case where DB was reset)
    ensureUser(userAddress);

    // Check if user already has an agent
    const existing = getAgentByUser(userAddress);
    if (existing && existing.status !== "terminated") {
      res.status(409).json({
        error: "You already have an active agent. Terminate it first.",
      });
      return;
    }

    // Check for pending deploy
    const pendingDeploy = getPendingDeployByUser(userAddress);
    if (pendingDeploy) {
      res.status(409).json({
        error: "You have a deployment in progress. Please wait for it to complete.",
        dispatchId: pendingDeploy.dispatch_id,
      });
      return;
    }

    // Create agent record
    agentId = createAgent(userAddress, name);

    // Deploy to EigenCompute
    // The ecloud_name is the friendly name passed to --name; the hex app_id is canonical
    const ecloudName = `eigenskills-${userAddress.slice(2, 10)}`;
    const result = await deployAgent(ecloudName, envVars);

    // Handle async deployment (GitHub Actions)
    if (isAsyncDeployResult(result)) {
      // Store env vars and mark as deploying
      updateAgent(agentId, {
        ecloud_name: ecloudName,
        status: "deploying",
        env_vars: encryptEnvVars(JSON.stringify(envVars)),
      });

      // Track the pending deploy
      createPendingDeploy(result.dispatchId, userAddress, agentId, "deploy");

      res.json({
        agentId,
        pending: true,
        dispatchId: result.dispatchId,
        message: "Deployment started. This may take 1-2 minutes.",
      });
      return;
    }

    // Handle sync deployment (local dev with Docker)
    // The deploy output does not include Instance IP or sometimes
    // Docker Digest. Fetch them via `ecloud compute app info`.
    let { instanceIp, dockerDigest, walletAddressEth, walletAddressSol } = result;
    if (!instanceIp || !dockerDigest) {
      try {
        const info = await getAppInfo(result.appId);
        instanceIp = info.instanceIp || instanceIp;
        dockerDigest = info.dockerDigest || dockerDigest;
        walletAddressEth = info.walletAddressEth || walletAddressEth;
        walletAddressSol = info.walletAddressSol || walletAddressSol;
      } catch (infoErr) {
        console.warn("Failed to fetch app info after deploy:", infoErr);
      }
    }

    // Update agent record with deployment details
    updateAgent(agentId, {
      app_id: result.appId,
      ecloud_name: ecloudName,
      wallet_address_eth: walletAddressEth,
      wallet_address_sol: walletAddressSol,
      instance_ip: instanceIp,
      docker_digest: dockerDigest,
      status: "running",
      env_vars: encryptEnvVars(JSON.stringify(envVars)),
    });

    res.json({
      agentId,
      appId: result.appId,
      walletAddress: walletAddressEth,
      instanceIp,
    });
  } catch (error) {
    console.error("Deploy error:", error);
    if (agentId) {
      updateAgent(agentId, { status: "terminated" });
    }
    res.status(500).json({ error: "Deployment failed" });
  }
});

// GET /api/agents/deploy-status — check async deploy status
app.get("/api/agents/deploy-status", requireAuth, (req, res) => {
  try {
    const userAddress = getUserAddress(req);
    const dispatchId = typeof req.query.dispatchId === "string" ? req.query.dispatchId : undefined;

    let pendingDeploy: PendingDeployRow | undefined;
    if (dispatchId) {
      pendingDeploy = getPendingDeploy(dispatchId);
      if (pendingDeploy && pendingDeploy.user_address !== userAddress.toLowerCase()) {
        res.status(403).json({ error: "Not authorized to view this deployment" });
        return;
      }
    } else {
      pendingDeploy = getPendingDeployByUser(userAddress);
    }

    if (!pendingDeploy) {
      res.json({ status: "not_found" });
      return;
    }

    if (pendingDeploy.status === "pending") {
      res.json({
        status: "pending",
        dispatchId: pendingDeploy.dispatch_id,
        action: pendingDeploy.action,
        createdAt: pendingDeploy.created_at,
      });
      return;
    }

    // Completed (success or error)
    const agent = pendingDeploy.agent_id ? getAgentByUser(userAddress) : undefined;
    res.json({
      status: pendingDeploy.status,
      dispatchId: pendingDeploy.dispatch_id,
      action: pendingDeploy.action,
      error: pendingDeploy.error_message,
      completedAt: pendingDeploy.completed_at,
      agent: agent
        ? {
            id: agent.id,
            appId: agent.app_id,
            walletAddress: agent.wallet_address_eth,
            instanceIp: agent.instance_ip,
            status: agent.status,
          }
        : undefined,
    });
  } catch (error) {
    console.error("Deploy status error:", error);
    res.status(500).json({ error: "Failed to get deploy status" });
  }
});

// Webhook secret for verifying GitHub Actions callbacks
const DEPLOY_WEBHOOK_SECRET = process.env.DEPLOY_WEBHOOK_SECRET ?? "";

// POST /api/webhook/deploy-result — callback from GitHub Actions
// Use raw body for HMAC verification
app.post(
  "/api/webhook/deploy-result",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    try {
      // Verify webhook signature
      const signature = req.headers["x-webhook-signature"];
      const timestamp = req.headers["x-webhook-timestamp"];

      if (!signature || typeof signature !== "string" || !DEPLOY_WEBHOOK_SECRET) {
        console.warn("Webhook missing signature or secret not configured");
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      // Use raw body for HMAC verification
      const rawBody = req.body.toString("utf8");
      console.log("Webhook raw body length:", rawBody.length);
      console.log("Webhook raw body:", rawBody.substring(0, 200));
      console.log("Secret length:", DEPLOY_WEBHOOK_SECRET.length);
      const expectedSig = createHmac("sha256", DEPLOY_WEBHOOK_SECRET).update(rawBody).digest("hex");

      const sigBuffer = Buffer.from(signature.replace("sha256=", ""), "hex");
      const expectedBuffer = Buffer.from(expectedSig, "hex");

      if (
        sigBuffer.length !== expectedBuffer.length ||
        !timingSafeEqual(sigBuffer, expectedBuffer)
      ) {
        console.warn("Webhook signature mismatch");
        console.warn("Expected:", expectedSig);
        console.warn("Received:", signature.replace("sha256=", ""));
        res.status(401).json({ error: "Invalid signature" });
        return;
      }

      // Check timestamp (5 minute window)
      const ts = parseInt(timestamp as string, 10);
      if (isNaN(ts) || Math.abs(Date.now() / 1000 - ts) > 300) {
        console.warn("Webhook timestamp out of range");
        res.status(401).json({ error: "Timestamp expired" });
        return;
      }

      // Parse JSON from raw body
      const body = JSON.parse(rawBody);
      const {
        dispatch_id,
        status,
        error,
        app_id,
        wallet_address_eth,
        wallet_address_sol,
        instance_ip,
        docker_digest,
      } = body;

      console.log(`Received deploy webhook: dispatch_id=${dispatch_id}, status=${status}`);

      // Get pending deploy record
      const pendingDeploy = getPendingDeploy(dispatch_id);
      if (!pendingDeploy) {
        console.warn(`Unknown dispatch_id: ${dispatch_id}`);
        res.status(404).json({ error: "Unknown dispatch_id" });
        return;
      }

      // Update pending deploy status
      completePendingDeploy(dispatch_id, status === "success" ? "success" : "error", error || null);

      // Update agent record if deploy succeeded
      if (status === "success" && pendingDeploy.agent_id) {
        updateAgent(pendingDeploy.agent_id, {
          app_id: app_id || undefined,
          wallet_address_eth: wallet_address_eth || undefined,
          wallet_address_sol: wallet_address_sol || undefined,
          instance_ip: instance_ip || undefined,
          docker_digest: docker_digest || undefined,
          status: "running",
        });
        console.log(`Agent ${pendingDeploy.agent_id} deployed successfully: app_id=${app_id}`);
      } else if (status !== "success" && pendingDeploy.agent_id) {
        updateAgent(pendingDeploy.agent_id, { status: "terminated" });
        console.log(`Agent ${pendingDeploy.agent_id} deploy failed: ${error}`);
      }

      res.json({ success: true });
    } catch (err) {
      console.error("Webhook processing error:", err);
      res.status(500).json({ error: "Webhook processing failed" });
    }
  }
);

// POST /api/agents/upgrade — update agent env vars
app.post("/api/agents/upgrade", requireAuth, async (req, res) => {
  try {
    const userAddress = getUserAddress(req);
    const parsed = upgradeRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request: " + parsed.error.issues[0]?.message });
      return;
    }

    const { envVars } = parsed.data;
    const agent = getAgentByUser(userAddress);
    if (!agent?.app_id) {
      res.status(404).json({ error: "No active agent found" });
      return;
    }

    if (agent.status === "deploying") {
      res
        .status(409)
        .json({ error: "Agent is still deploying. Wait for it to finish, then try again." });
      return;
    }

    // Validate: grant vars cannot be deleted
    if (agent.env_vars) {
      let stored: { key: string; value: string; isPublic: boolean }[];
      try {
        stored = JSON.parse(decryptEnvVars(agent.env_vars));
      } catch {
        stored = [];
      }
      const incomingKeys = new Set(envVars.map((v) => v.key));
      for (const key of GRANT_VAR_KEYS) {
        const hadKey = stored.some((v) => v.key === key);
        const hasKey = incomingKeys.has(key);
        if (hadKey && !hasKey) {
          res.status(400).json({
            error: `Cannot remove required grant variable: ${key}. It is required for EigenAI authorization.`,
          });
          return;
        }
        if (hadKey && hasKey) {
          const entry = envVars.find((v) => v.key === key);
          if (!entry?.value?.trim()) {
            res.status(400).json({
              error: `Grant variable ${key} must not be empty.`,
            });
            return;
          }
        }
      }
    }

    await upgradeAgent(agent.app_id, envVars);
    updateAgent(agent.id, {
      status: "running",
      env_vars: encryptEnvVars(JSON.stringify(envVars)),
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Upgrade error:", error);
    res.status(500).json({ error: "Upgrade failed" });
  }
});

// POST /api/agents/stop
app.post("/api/agents/stop", requireAuth, async (req, res) => {
  try {
    const userAddress = getUserAddress(req);
    const agent = getAgentByUser(userAddress);
    if (!agent?.app_id) {
      res.status(404).json({ error: "No active agent found" });
      return;
    }

    await stopAgent(agent.app_id);
    updateAgent(agent.id, { status: "stopped" });
    res.json({ success: true });
  } catch (error) {
    console.error("Stop error:", error);
    res.status(500).json({ error: "Stop failed" });
  }
});

// POST /api/agents/start
app.post("/api/agents/start", requireAuth, async (req, res) => {
  try {
    const userAddress = getUserAddress(req);
    const agent = getAgentByUser(userAddress);
    if (!agent?.app_id) {
      res.status(404).json({ error: "No active agent found" });
      return;
    }

    await startAgent(agent.app_id);

    // IP may change after stop/start — refresh from EigenCompute
    // Prefer ecloud_name for readability in logs, fall back to hex app_id
    const updates: Parameters<typeof updateAgent>[1] = { status: "running" };
    try {
      const info = await getAppInfo(agent.ecloud_name ?? agent.app_id);
      if (info.instanceIp) updates.instance_ip = info.instanceIp;
      if (info.dockerDigest) updates.docker_digest = info.dockerDigest;
    } catch (infoErr) {
      console.warn("Failed to fetch app info after start:", infoErr);
    }

    updateAgent(agent.id, updates);
    res.json({ success: true });
  } catch (error) {
    console.error("Start error:", error);
    res.status(500).json({ error: "Start failed" });
  }
});

// POST /api/agents/terminate
app.post("/api/agents/terminate", requireAuth, async (req, res) => {
  try {
    const userAddress = getUserAddress(req);
    const agent = getAgentByUser(userAddress);
    if (!agent || agent.status === "terminated") {
      res.status(404).json({ error: "No active agent found" });
      return;
    }

    // If agent has an app_id, terminate on EigenCompute
    if (agent.app_id) {
      try {
        await terminateAgent(agent.app_id);
      } catch (err) {
        console.warn("EigenCompute terminate failed (may not exist):", err);
      }
    }

    // Always mark as terminated in database
    updateAgent(agent.id, { status: "terminated" });
    res.json({ success: true });
  } catch (error) {
    console.error("Terminate error:", error);
    res.status(500).json({ error: "Terminate failed" });
  }
});

// GET /api/agents/info
app.get("/api/agents/info", requireAuth, async (req, res) => {
  try {
    const userAddress = getUserAddress(req);
    const agent = getAgentByUser(userAddress);

    if (!agent) {
      res.status(404).json({ error: "No agent found" });
      return;
    }

    // If instance_ip is missing and the agent should be running,
    // try fetching it live from EigenCompute (handles the case where
    // deploy output didn't include the IP).
    // Prefer ecloud_name for readability in logs, fall back to hex app_id
    if (!agent.instance_ip && agent.app_id && agent.status === "running") {
      try {
        const info = await getAppInfo(agent.ecloud_name ?? agent.app_id);
        if (info.instanceIp) {
          updateAgent(agent.id, {
            instance_ip: info.instanceIp,
            ...(info.dockerDigest && !agent.docker_digest
              ? { docker_digest: info.dockerDigest }
              : {}),
            ...(info.walletAddressEth && !agent.wallet_address_eth
              ? { wallet_address_eth: info.walletAddressEth }
              : {}),
            ...(info.walletAddressSol && !agent.wallet_address_sol
              ? { wallet_address_sol: info.walletAddressSol }
              : {}),
          });
          agent.instance_ip = info.instanceIp;
          agent.docker_digest = info.dockerDigest || agent.docker_digest;
          agent.wallet_address_eth = info.walletAddressEth || agent.wallet_address_eth;
          agent.wallet_address_sol = info.walletAddressSol || agent.wallet_address_sol;
        }
      } catch (infoErr) {
        console.warn("Failed to fetch app info for running agent:", infoErr);
      }
    }

    // Check if agent is actually reachable (healthy)
    let healthy = false;
    if (agent.status === "running" && agent.instance_ip) {
      try {
        const healthRes = await fetch(`http://${agent.instance_ip}:${AGENT_PORT}/health`, {
          signal: AbortSignal.timeout(3000),
        });
        healthy = healthRes.ok;
      } catch {
        // Agent not reachable yet — still starting up
      }
    }

    res.json({
      name: agent.name,
      status: agent.status,
      appId: agent.app_id,
      walletAddressEth: agent.wallet_address_eth,
      walletAddressSol: agent.wallet_address_sol,
      instanceIp: agent.instance_ip,
      dockerDigest: agent.docker_digest,
      createdAt: agent.created_at,
      healthy,
    });
  } catch (error) {
    console.error("Info error:", error);
    res.status(500).json({ error: "Failed to get agent info" });
  }
});

// GET /api/agents/env — return agent env vars for Settings panel (authenticated)
app.get("/api/agents/env", requireAuth, async (req, res) => {
  try {
    const userAddress = getUserAddress(req);
    const agent = getAgentByUser(userAddress);

    if (!agent?.app_id) {
      res.status(404).json({ error: "No active agent found" });
      return;
    }

    if (!agent.env_vars) {
      res.json({ envVars: [] });
      return;
    }

    const envVars = JSON.parse(decryptEnvVars(agent.env_vars)) as {
      key: string;
      value: string;
      isPublic: boolean;
    }[];
    res.json({ envVars });
  } catch (error) {
    console.error("Env fetch error:", error);
    res.status(500).json({ error: "Failed to get agent env vars" });
  }
});

// POST /api/agents/task — proxy task submission to the agent
// This avoids CORS issues since the agent doesn't serve CORS headers.
app.post("/api/agents/task", requireAuth, async (req, res) => {
  try {
    const agent = getActiveAgentOrError(req, res);
    if (!agent) return;

    if (!agent.instance_ip) {
      res.status(503).json({ error: "Agent instance IP not available yet" });
      return;
    }

    const parsed = taskRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Missing or invalid 'task' field" });
      return;
    }

    const { task } = parsed.data;
    if (task.length > MAX_TASK_LENGTH) {
      res.status(400).json({ error: `Task exceeds maximum length (${MAX_TASK_LENGTH / 1024}KB)` });
      return;
    }

    const agentUrl = `http://${agent.instance_ip}:${AGENT_PORT}/task`;
    const agentRes = await fetch(agentUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ task }),
    });

    if (!agentRes.ok) {
      const errBody = await agentRes.json().catch(() => ({}));
      res.status(agentRes.status).json(errBody);
      return;
    }

    const result = await agentRes.json();
    res.json(result);
  } catch (error) {
    handleRouteError(res, error, "Task proxy");
  }
});

// GET /api/agents/skills — proxy to agent's skills endpoint
app.get("/api/agents/skills", requireAuth, async (req, res) => {
  try {
    await proxyGetToAgent(req, res, "/skills", "skills");
  } catch (error) {
    handleRouteError(res, error, "Skills proxy");
  }
});

// GET /api/agents/history — proxy to agent's history endpoint
app.get("/api/agents/history", requireAuth, async (req, res) => {
  try {
    await proxyGetToAgent(req, res, "/history", "history");
  } catch (error) {
    handleRouteError(res, error, "History proxy");
  }
});

// GET /api/agents/logs — fetch EigenCompute logs via CLI
app.get("/api/agents/logs", requireAuth, async (req, res) => {
  try {
    const agent = getActiveAgentOrError(req, res, false);
    if (!agent) return;

    if (!agent.app_id) {
      res.status(404).json({ error: "No agent app ID found" });
      return;
    }

    const lines = parseInt(req.query.lines as string) || DEFAULT_LOG_LINES;
    const logs = await getAppLogs(agent.app_id, lines);
    res.json({ logs });
  } catch (error) {
    handleRouteError(res, error, "Logs fetch");
  }
});

// ── Session persistence endpoints ──────────────────────────────────────────

// POST /api/agents/sessions/save — upsert session messages (signed by agent)
app.post("/api/agents/sessions/save", requireAuth, (req, res) => {
  try {
    const userAddress = getUserAddress(req);
    const parsed = sessionSaveSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request: " + parsed.error.issues[0]?.message });
      return;
    }

    const { sessionId, messages, signature } = parsed.data;
    saveSession(userAddress, sessionId, JSON.stringify(messages), signature);
    res.json({ success: true });
  } catch (error) {
    handleRouteError(res, error, "Session save");
  }
});

// GET /api/agents/sessions/load?sessionId= — load session messages
app.get("/api/agents/sessions/load", requireAuth, (req, res) => {
  try {
    const userAddress = getUserAddress(req);
    const sessionId = req.query.sessionId as string;
    if (!sessionId) {
      res.status(400).json({ error: "Missing sessionId query parameter" });
      return;
    }

    const session = loadSession(userAddress, sessionId);
    if (!session) {
      res.json({ messages: [], signature: null });
      return;
    }

    res.json({
      messages: JSON.parse(session.messages),
      signature: session.signature,
      updatedAt: session.updated_at,
    });
  } catch (error) {
    handleRouteError(res, error, "Session load");
  }
});

// GET /api/agents/sessions — list all sessions for this user
app.get("/api/agents/sessions", requireAuth, (req, res) => {
  try {
    const userAddress = getUserAddress(req);
    const sessions = listSessions(userAddress);
    res.json({ sessions });
  } catch (error) {
    handleRouteError(res, error, "Session list");
  }
});

// DELETE /api/agents/sessions?sessionId= — delete a session
app.delete("/api/agents/sessions", requireAuth, (req, res) => {
  try {
    const userAddress = getUserAddress(req);
    const sessionId = req.query.sessionId as string;
    if (!sessionId) {
      res.status(400).json({ error: "Missing sessionId query parameter" });
      return;
    }

    const deleted = deleteSession(userAddress, sessionId);
    res.json({ success: deleted });
  } catch (error) {
    handleRouteError(res, error, "Session delete");
  }
});

// ── Memory persistence endpoints ───────────────────────────────────────────

// POST /api/agents/memory — upsert a memory entry (signed by agent)
app.post("/api/agents/memory", requireAuth, (req, res) => {
  try {
    const userAddress = getUserAddress(req);
    const parsed = memorySaveSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request: " + parsed.error.issues[0]?.message });
      return;
    }
    const { key, content, signature } = parsed.data;
    saveMemory(userAddress, key, content, signature);
    res.json({ success: true });
  } catch (error) {
    handleRouteError(res, error, "Memory save");
  }
});

// GET /api/agents/memory — list all memory entries
app.get("/api/agents/memory", requireAuth, (req, res) => {
  try {
    const userAddress = getUserAddress(req);
    const q = req.query.q as string | undefined;
    const entries = q ? searchMemory(userAddress, q) : listMemory(userAddress);
    res.json({
      entries: entries.map((e: MemoryRow) => ({
        key: e.key,
        content: e.content,
        updatedAt: e.updated_at,
      })),
    });
  } catch (error) {
    handleRouteError(res, error, "Memory list");
  }
});

// DELETE /api/agents/memory?key= — delete a memory entry
app.delete("/api/agents/memory", requireAuth, (req, res) => {
  try {
    const userAddress = getUserAddress(req);
    const key = req.query.key as string;
    if (!key) {
      res.status(400).json({ error: "Missing key query parameter" });
      return;
    }
    const deleted = deleteMemory(userAddress, key);
    res.json({ success: deleted });
  } catch (error) {
    handleRouteError(res, error, "Memory delete");
  }
});

// ── Learnings endpoints ────────────────────────────────────────────────────

// POST /api/agents/learnings — create a learning entry
app.post("/api/agents/learnings", requireAuth, (req, res) => {
  try {
    const userAddress = getUserAddress(req);
    const parsed = learningCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request: " + parsed.error.issues[0]?.message });
      return;
    }
    createLearning(userAddress, parsed.data);
    res.json({ success: true, entryId: parsed.data.entryId });
  } catch (error) {
    handleRouteError(res, error, "Learning create");
  }
});

// GET /api/agents/learnings — list learnings, filterable by ?status= and ?type=
app.get("/api/agents/learnings", requireAuth, (req, res) => {
  try {
    const userAddress = getUserAddress(req);
    const q = req.query.q as string | undefined;
    if (q) {
      const entries = searchLearnings(userAddress, q);
      res.json({ entries });
      return;
    }
    const entries = listLearnings(userAddress, {
      status: req.query.status as string | undefined,
      entryType: req.query.type as string | undefined,
    });
    res.json({ entries });
  } catch (error) {
    handleRouteError(res, error, "Learning list");
  }
});

// PATCH /api/agents/learnings/:entryId — update status
app.patch("/api/agents/learnings/:entryId", requireAuth, (req, res) => {
  try {
    const parsed = learningUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request: " + parsed.error.issues[0]?.message });
      return;
    }
    const updated = updateLearningStatus(
      String(req.params.entryId),
      parsed.data.status,
      parsed.data.promotedTo
    );
    res.json({ success: updated });
  } catch (error) {
    handleRouteError(res, error, "Learning update");
  }
});

// ── Workspace files endpoints ──────────────────────────────────────────────

// GET /api/agents/workspace/:filename — load a workspace file
app.get("/api/agents/workspace/:filename", requireAuth, (req, res) => {
  try {
    const userAddress = getUserAddress(req);
    const file = getWorkspaceFile(userAddress, String(req.params.filename));
    if (!file) {
      res.json({ content: null });
      return;
    }
    res.json({ content: file.content, updatedAt: file.updated_at });
  } catch (error) {
    handleRouteError(res, error, "Workspace file load");
  }
});

// PUT /api/agents/workspace/:filename — upsert a workspace file
app.put("/api/agents/workspace/:filename", requireAuth, (req, res) => {
  try {
    const userAddress = getUserAddress(req);
    const parsed = workspaceFileSaveSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid request: " + parsed.error.issues[0]?.message });
      return;
    }
    saveWorkspaceFile(
      userAddress,
      String(req.params.filename),
      parsed.data.content,
      parsed.data.signature
    );
    res.json({ success: true });
  } catch (error) {
    handleRouteError(res, error, "Workspace file save");
  }
});

// ── Telegram linking endpoints ──────────────────────────────────────────────

// POST /api/telegram/link — generate a link code for this user
app.post("/api/telegram/link", requireAuth, (_req, res) => {
  try {
    const userAddress = getUserAddress(_req);
    const code = Math.random().toString(36).slice(2, 10);
    createTelegramLinkCode(userAddress, code);
    const botUsername = process.env.TELEGRAM_BOT_USERNAME ?? "eigenskills_bot";
    res.json({
      code,
      url: `https://t.me/${botUsername}?start=${code}`,
    });
  } catch (error) {
    handleRouteError(res, error, "Telegram link");
  }
});

// GET /api/telegram/status — check if Telegram is linked
app.get("/api/telegram/status", requireAuth, (req, res) => {
  try {
    const userAddress = getUserAddress(req);
    const link = getTelegramLinkByUser(userAddress);
    res.json({
      linked: !!link?.telegram_chat_id,
      chatId: link?.telegram_chat_id ?? null,
    });
  } catch (error) {
    handleRouteError(res, error, "Telegram status");
  }
});

// DELETE /api/telegram/link — unlink Telegram
app.delete("/api/telegram/link", requireAuth, (req, res) => {
  try {
    const userAddress = getUserAddress(req);
    const unlinked = unlinkTelegram(userAddress);
    res.json({ success: unlinked });
  } catch (error) {
    handleRouteError(res, error, "Telegram unlink");
  }
});

// ── Heartbeat notification endpoint (agent → backend → Telegram) ───────────

app.post("/api/heartbeat/notify", async (req, res) => {
  try {
    const { message, userAddress } = req.body;
    if (!message) {
      res.status(400).json({ error: "Missing message" });
      return;
    }

    // If userAddress is specified, send to that user's linked Telegram
    if (userAddress) {
      const link = getTelegramLinkByUser(userAddress);
      if (link?.telegram_chat_id) {
        await sendTelegramMessage(link.telegram_chat_id, message);
      }
    }

    res.json({ success: true });
  } catch (error) {
    handleRouteError(res, error, "Heartbeat notify");
  }
});

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Global error handler — catches unhandled errors from async routes
const globalErrorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
};
app.use(globalErrorHandler);

app.listen(PORT, () => {
  console.log(`EigenSkills Backend running on port ${PORT}`);
  try {
    initTelegramBot();
  } catch (err) {
    console.error("Telegram bot failed to start (non-fatal):", err);
  }
});
