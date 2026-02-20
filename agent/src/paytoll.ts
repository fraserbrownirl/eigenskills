/**
 * PayToll TEE Bridge Module
 *
 * Full HTTP proxy for x402 micropayments. Skill scripts describe requests via fd3 IPC;
 * this module signs payments with the TEE wallet, sends HTTP requests to PayToll,
 * and returns responses. Scripts never need network access to PayToll directly.
 */

import { mnemonicToAccount, type HDAccount } from "viem/accounts";
import { createPublicClient, http, formatUnits, parseUnits, type Address } from "viem";
import { base, baseSepolia } from "viem/chains";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

// ── Configuration ──────────────────────────────────────────────────────────

const CHAIN = process.env.ENVIRONMENT === "production" ? base : baseSepolia;

const USDC_ADDRESS: Address =
  CHAIN.id === base.id
    ? "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" // Base Mainnet USDC
    : "0x036CbD53842c5426634e7929541eC2318f3dCF7e"; // Base Sepolia USDC

const RPC_URL = CHAIN.id === base.id ? "https://mainnet.base.org" : "https://sepolia.base.org";

const BRIDGE_TIMEOUT_MS = 30_000;
const PAYTOLL_STATE_DIR = "/tmp/paytoll";

// Default spending limits (can be overridden per session)
const DEFAULT_LIMITS = {
  perRequestMaxUsdc: "1.00",
  perTaskMaxUsdc: "10.00",
  perSessionMaxUsdc: "50.00",
};

// ── Error Types ────────────────────────────────────────────────────────────

export type BridgeErrorCode =
  | "INSUFFICIENT_USDC"
  | "BUDGET_EXCEEDED"
  | "SIGNING_FAILED"
  | "NETWORK_ERROR"
  | "TIMEOUT"
  | "INVALID_CHALLENGE"
  | "NO_WALLET";

export class BridgeError extends Error {
  code: BridgeErrorCode;
  recoverable: boolean;
  suggestedAction?: string;

  constructor(
    code: BridgeErrorCode,
    message: string,
    recoverable = false,
    suggestedAction?: string
  ) {
    super(message);
    this.name = "BridgeError";
    this.code = code;
    this.recoverable = recoverable;
    this.suggestedAction = suggestedAction;
  }

  toResponse(): BridgeErrorResponse {
    return {
      error: this.code,
      message: this.message,
      recoverable: this.recoverable,
      suggestedAction: this.suggestedAction,
    };
  }
}

// ── Type Definitions ───────────────────────────────────────────────────────

export interface X402Request {
  action: "x402_request";
  id?: number;
  url: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  body?: Record<string, unknown>;
  taskId?: string;
}

export interface X402Response {
  id?: number;
  status: number;
  body: unknown;
  paymentMade: boolean;
  paymentAmount?: string;
}

export interface BridgeErrorResponse {
  error: BridgeErrorCode;
  message: string;
  recoverable: boolean;
  suggestedAction?: string;
}

export interface X402Challenge {
  amount: bigint;
  recipient: Address;
  token: Address;
  nonce: string;
  expiry: number;
  paymentId?: string;
}

export interface PaymentReceipt {
  timestamp: number;
  endpoint: string;
  method: string;
  challenge: {
    amount: string;
    recipient: string;
    nonce: string;
  };
  signature: string;
  taskId?: string;
}

export interface SessionSpending {
  sessionId: string;
  startedAt: string;
  limits: {
    perRequestMaxUsdc: string;
    perTaskMaxUsdc: string;
    perSessionMaxUsdc: string;
  };
  spent: {
    totalUsdc: string;
    byCategory: Record<string, string>;
    byTask: Record<string, string>;
  };
  transactions: PaymentReceipt[];
}

// ── State Management ───────────────────────────────────────────────────────

let sessionSpending: SessionSpending | null = null;

function ensureStateDir(): void {
  if (!existsSync(PAYTOLL_STATE_DIR)) {
    mkdirSync(PAYTOLL_STATE_DIR, { recursive: true });
  }
}

function getSessionFilePath(): string {
  return join(PAYTOLL_STATE_DIR, "session-spending.json");
}

function getReceiptsFilePath(): string {
  return join(PAYTOLL_STATE_DIR, "receipts.json");
}

function loadSessionSpending(): SessionSpending {
  if (sessionSpending) return sessionSpending;

  ensureStateDir();
  const filePath = getSessionFilePath();

  if (existsSync(filePath)) {
    try {
      sessionSpending = JSON.parse(readFileSync(filePath, "utf-8"));
      return sessionSpending!;
    } catch {
      // Corrupted file, start fresh
    }
  }

  // Initialize new session
  sessionSpending = {
    sessionId: `sess_${Date.now()}`,
    startedAt: new Date().toISOString(),
    limits: { ...DEFAULT_LIMITS },
    spent: {
      totalUsdc: "0",
      byCategory: {},
      byTask: {},
    },
    transactions: [],
  };

  saveSessionSpending();
  return sessionSpending;
}

function saveSessionSpending(): void {
  if (!sessionSpending) return;
  ensureStateDir();
  writeFileSync(getSessionFilePath(), JSON.stringify(sessionSpending, null, 2));
}

export function getSessionSpending(): SessionSpending {
  return loadSessionSpending();
}

export function resetSession(limits?: Partial<SessionSpending["limits"]>): void {
  sessionSpending = {
    sessionId: `sess_${Date.now()}`,
    startedAt: new Date().toISOString(),
    limits: { ...DEFAULT_LIMITS, ...limits },
    spent: {
      totalUsdc: "0",
      byCategory: {},
      byTask: {},
    },
    transactions: [],
  };
  saveSessionSpending();
}

// ── Payment Recording ──────────────────────────────────────────────────────

export function recordPayment(receipt: PaymentReceipt): void {
  const session = loadSessionSpending();

  // Update totals
  const amountUsdc = parseFloat(receipt.challenge.amount);
  session.spent.totalUsdc = (parseFloat(session.spent.totalUsdc) + amountUsdc).toFixed(6);

  // Categorize by endpoint path
  const category = categorizeEndpoint(receipt.endpoint);
  session.spent.byCategory[category] = (
    parseFloat(session.spent.byCategory[category] ?? "0") + amountUsdc
  ).toFixed(6);

  // Track by task if applicable
  if (receipt.taskId) {
    session.spent.byTask[receipt.taskId] = (
      parseFloat(session.spent.byTask[receipt.taskId] ?? "0") + amountUsdc
    ).toFixed(6);
  }

  // Append transaction
  session.transactions.push(receipt);

  saveSessionSpending();

  // Also append to receipts file for audit
  appendReceipt(receipt);
}

function appendReceipt(receipt: PaymentReceipt): void {
  ensureStateDir();
  const filePath = getReceiptsFilePath();

  let receipts: PaymentReceipt[] = [];
  if (existsSync(filePath)) {
    try {
      receipts = JSON.parse(readFileSync(filePath, "utf-8"));
    } catch {
      receipts = [];
    }
  }

  receipts.push(receipt);
  writeFileSync(filePath, JSON.stringify(receipts, null, 2));
}

function categorizeEndpoint(url: string): string {
  if (url.includes("/agents")) return "search";
  if (url.includes("/tasks") && url.includes("/fund")) return "escrow";
  if (url.includes("/tasks") && url.includes("/status")) return "polling";
  if (url.includes("/tasks")) return "task_creation";
  return "other";
}

// ── Budget Enforcement ─────────────────────────────────────────────────────

export async function checkSpendingLimits(amount: bigint, taskId?: string): Promise<void> {
  const session = loadSessionSpending();
  const amountUsdc = parseFloat(formatUnits(amount, 6));

  // Check per-request limit
  const perRequestMax = parseFloat(session.limits.perRequestMaxUsdc);
  if (amountUsdc > perRequestMax) {
    throw new BridgeError(
      "BUDGET_EXCEEDED",
      `Payment of ${amountUsdc.toFixed(4)} USDC exceeds per-request limit of ${perRequestMax} USDC`,
      false,
      "Request orchestrator approval for larger payment"
    );
  }

  // Check per-session limit
  const currentTotal = parseFloat(session.spent.totalUsdc);
  const perSessionMax = parseFloat(session.limits.perSessionMaxUsdc);
  if (currentTotal + amountUsdc > perSessionMax) {
    throw new BridgeError(
      "BUDGET_EXCEEDED",
      `Payment would exceed session limit: ${currentTotal.toFixed(4)} + ${amountUsdc.toFixed(4)} > ${perSessionMax} USDC`,
      false,
      "Request budget increase from orchestrator"
    );
  }

  // Check per-task limit if taskId provided
  if (taskId) {
    const taskSpent = parseFloat(session.spent.byTask[taskId] ?? "0");
    const perTaskMax = parseFloat(session.limits.perTaskMaxUsdc);
    if (taskSpent + amountUsdc > perTaskMax) {
      throw new BridgeError(
        "BUDGET_EXCEEDED",
        `Task ${taskId} would exceed limit: ${taskSpent.toFixed(4)} + ${amountUsdc.toFixed(4)} > ${perTaskMax} USDC`,
        false,
        "Task budget exhausted, consider splitting or requesting increase"
      );
    }
  }

  // Check USDC balance on-chain
  await ensureSufficientBalance(amount);
}

async function ensureSufficientBalance(amount: bigint): Promise<void> {
  const balance = await getUSDCBalance();
  if (balance < amount) {
    const needed = formatUnits(amount, 6);
    const have = formatUnits(balance, 6);
    throw new BridgeError(
      "INSUFFICIENT_USDC",
      `Need ${needed} USDC, have ${have}`,
      false,
      "Fund wallet on Base with USDC"
    );
  }
}

async function getUSDCBalance(): Promise<bigint> {
  const account = getAccount();
  if (!account) return 0n;

  const client = createPublicClient({
    chain: CHAIN,
    transport: http(RPC_URL),
  });

  try {
    const balance = await client.readContract({
      address: USDC_ADDRESS,
      abi: [
        {
          name: "balanceOf",
          type: "function",
          stateMutability: "view",
          inputs: [{ name: "account", type: "address" }],
          outputs: [{ name: "", type: "uint256" }],
        },
      ],
      functionName: "balanceOf",
      args: [account.address],
    });
    return balance as bigint;
  } catch {
    // Network error, assume balance is okay (will fail at payment time if not)
    return parseUnits("1000", 6);
  }
}

// ── Wallet Access ──────────────────────────────────────────────────────────

function getAccount(): HDAccount | null {
  const mnemonic = process.env.MNEMONIC;
  if (!mnemonic) return null;
  return mnemonicToAccount(mnemonic);
}

// ── x402 Protocol Implementation ───────────────────────────────────────────

function parseX402Challenge(headers: Headers): X402Challenge {
  const paymentHeader = headers.get("X-Payment");
  if (!paymentHeader) {
    throw new BridgeError("INVALID_CHALLENGE", "Missing X-Payment header in 402 response", false);
  }

  try {
    const parsed = JSON.parse(paymentHeader);
    return {
      amount: BigInt(parsed.amount ?? parsed.maxAmountRequired ?? "0"),
      recipient: parsed.recipient ?? parsed.payTo,
      token: parsed.token ?? USDC_ADDRESS,
      nonce: parsed.nonce ?? crypto.randomUUID(),
      expiry: parsed.expiry ?? Math.floor(Date.now() / 1000) + 300,
      paymentId: parsed.paymentId,
    };
  } catch {
    throw new BridgeError(
      "INVALID_CHALLENGE",
      `Failed to parse X-Payment header: ${paymentHeader}`,
      false
    );
  }
}

async function signX402Challenge(account: HDAccount, challenge: X402Challenge): Promise<string> {
  // x402 uses EIP-712 typed data signing
  const domain = {
    name: "x402",
    version: "1",
    chainId: CHAIN.id,
  };

  const types = {
    Payment: [
      { name: "amount", type: "uint256" },
      { name: "recipient", type: "address" },
      { name: "token", type: "address" },
      { name: "nonce", type: "string" },
      { name: "expiry", type: "uint256" },
    ],
  };

  const message = {
    amount: challenge.amount,
    recipient: challenge.recipient,
    token: challenge.token,
    nonce: challenge.nonce,
    expiry: BigInt(challenge.expiry),
  };

  try {
    const signature = await account.signTypedData({
      domain,
      types,
      primaryType: "Payment",
      message,
    });
    return signature;
  } catch (err) {
    throw new BridgeError(
      "SIGNING_FAILED",
      `Failed to sign x402 challenge: ${err instanceof Error ? err.message : String(err)}`,
      false
    );
  }
}

// ── Timeout Wrapper ────────────────────────────────────────────────────────

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new BridgeError("TIMEOUT", "Bridge request timed out", true)), ms)
  );
  return Promise.race([promise, timeout]);
}

// ── Core HTTP Proxy ────────────────────────────────────────────────────────

export async function handleX402Request(
  request: X402Request
): Promise<X402Response | BridgeErrorResponse> {
  const account = getAccount();
  if (!account) {
    return new BridgeError(
      "NO_WALLET",
      "MNEMONIC not set — cannot sign x402 payments",
      false,
      "Configure MNEMONIC environment variable in TEE"
    ).toResponse();
  }

  try {
    return await withTimeout(executeX402Request(account, request), BRIDGE_TIMEOUT_MS);
  } catch (err) {
    if (err instanceof BridgeError) {
      return err.toResponse();
    }
    return new BridgeError(
      "NETWORK_ERROR",
      err instanceof Error ? err.message : String(err),
      true
    ).toResponse();
  }
}

async function executeX402Request(account: HDAccount, request: X402Request): Promise<X402Response> {
  // 1. Make initial request to PayToll
  let response: Response;
  try {
    response = await fetch(request.url, {
      method: request.method,
      headers: { "Content-Type": "application/json" },
      body: request.body ? JSON.stringify(request.body) : undefined,
    });
  } catch (err) {
    throw new BridgeError(
      "NETWORK_ERROR",
      `Failed to reach PayToll: ${err instanceof Error ? err.message : String(err)}`,
      true
    );
  }

  // 2. If not 402, return response directly (free tier or error)
  if (response.status !== 402) {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      body = await response.text();
    }

    return {
      id: request.id,
      status: response.status,
      body,
      paymentMade: false,
    };
  }

  // 3. Parse 402 Payment Required challenge
  const challenge = parseX402Challenge(response.headers);

  // 4. Check budget before signing
  await checkSpendingLimits(challenge.amount, request.taskId);

  // 5. Sign the challenge
  const signature = await signX402Challenge(account, challenge);

  // 6. Retry with payment header
  try {
    response = await fetch(request.url, {
      method: request.method,
      headers: {
        "Content-Type": "application/json",
        "X-Payment-Response": signature,
      },
      body: request.body ? JSON.stringify(request.body) : undefined,
    });
  } catch (err) {
    throw new BridgeError(
      "NETWORK_ERROR",
      `Failed to send paid request: ${err instanceof Error ? err.message : String(err)}`,
      true
    );
  }

  // 7. Record successful payment
  recordPayment({
    timestamp: Date.now(),
    endpoint: request.url,
    method: request.method,
    challenge: {
      amount: formatUnits(challenge.amount, 6),
      recipient: challenge.recipient,
      nonce: challenge.nonce,
    },
    signature,
    taskId: request.taskId,
  });

  // 8. Return response to skill script
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = await response.text();
  }

  return {
    id: request.id,
    status: response.status,
    body,
    paymentMade: true,
    paymentAmount: formatUnits(challenge.amount, 6),
  };
}

// ── Exports for testing/debugging ──────────────────────────────────────────

export function getWalletAddress(): string {
  return getAccount()?.address ?? "0x0000000000000000000000000000000000000000";
}

export function getChainConfig(): {
  chainId: number;
  chainName: string;
  usdcAddress: string;
  rpcUrl: string;
} {
  return {
    chainId: CHAIN.id,
    chainName: CHAIN.name,
    usdcAddress: USDC_ADDRESS,
    rpcUrl: RPC_URL,
  };
}
