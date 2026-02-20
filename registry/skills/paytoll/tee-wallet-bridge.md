---
name: tee-wallet-bridge
description: >
  How skill scripts make x402 payments without accessing the MNEMONIC.
  The TEE bridge is a full HTTP proxy — scripts describe requests, the
  bridge signs, sends, and returns responses. Uses fd3 IPC, not stdout.
---

# TEE Wallet Bridge

The MNEMONIC lives inside the TEE and must never be passed to skill
subprocesses. The bridge is a **full HTTP proxy** — skill scripts describe
what they want, the bridge handles signing AND sending.

## Architecture

```
┌───────────────────┐     ┌──────────────────────────┐     ┌────────────────┐
│  Skill Script     │     │  TEE Bridge (paytoll.ts) │     │  PayToll API   │
│  (subprocess)     │     │                          │     │                │
│                   │     │  1. Receives request     │     │                │
│  Describes:       │────▶│  2. Makes HTTP call      │────▶│  Returns 402   │
│  - endpoint URL   │ fd3 │  3. Parses 402 challenge │     │  or response   │
│  - method/body    │     │  4. Signs with wallet    │     │                │
│  - taskId         │     │  5. Retries with payment │     │                │
│                   │     │  6. Returns response     │     │                │
│  Receives:        │◀────│                          │◀────│                │
│  - final response │ fd3 │  + Records to receipts   │     │                │
└───────────────────┘     └──────────────────────────┘     └────────────────┘
```

## Why fd3, Not stdout

Skill scripts output debug logs, error messages, and library warnings to
stdout. Parsing JSON from stdout is fragile — one stray `console.log` breaks
the parser.

**fd3 is a dedicated IPC channel.** Node's `spawn` supports `stdio: ['pipe',
'pipe', 'pipe', 'pipe']` — the fourth element is fd3. Scripts write IPC
messages to fd3; stdout stays clean for normal output.

## How It Works

1. **Skill script** wants to call a PayToll endpoint
2. Script writes request to **fd3** (not stdout):
   ```json
   {
     "action": "x402_request",
     "url": "https://api.paytoll.org/v1/agents?query=image-generation",
     "method": "GET",
     "taskId": "task_xyz789"
   }
   ```
3. **TEE bridge** (in `paytoll.ts`) receives via fd3, makes the HTTP request
4. If PayToll returns `402 Payment Required`:
   - Bridge parses the challenge from `X-Payment` header
   - Checks against [[session-spending]] limits
   - Signs with `mnemonicToAccount(process.env.MNEMONIC)`
   - Retries with `X-Payment-Response` header
5. Bridge writes final response to **fd3**:
   ```json
   {
     "status": 200,
     "body": { "agents": [...] },
     "paymentMade": true,
     "paymentAmount": "0.001"
   }
   ```
6. Skill script reads response from fd3, continues execution

## Client Helper

Use `scripts/paytoll-client.js` for easy fd3 communication:

```javascript
import { x402Request } from './paytoll-client.js';

const result = await x402Request(
  'https://api.paytoll.org/v1/agents?query=image-generation',
  'GET'
);

if (result.error) {
  console.error(`Payment failed: ${result.message}`);
  console.error(`Suggested action: ${result.suggestedAction}`);
} else {
  console.log(`Found ${result.body.agents.length} agents`);
}
```

## Integration with executor.ts

The executor spawns skills with fd3 as a bidirectional IPC channel:

```typescript
const subprocess = spawn('sh', ['-c', command], {
  cwd,
  env,
  stdio: ['pipe', 'pipe', 'pipe', 'pipe'], // fd3 is index 3
});

const fd3 = subprocess.stdio[3];
const rl = readline.createInterface({ input: fd3 });

rl.on('line', async (line) => {
  const msg = JSON.parse(line);
  if (msg.action === 'x402_request') {
    const response = await handleX402Request(msg);
    fd3.write(JSON.stringify(response) + '\n');
  }
});
```

## Security Properties

- MNEMONIC **never** appears in subprocess environment
- `requires_env` stays empty — no secrets leak to skill scripts
- Scripts have no network access to PayToll — bridge is the only path
- Budget limits enforced at bridge level before signing (see [[session-spending]])
- All payments recorded to [[payment-receipts]] for audit

## Error Responses

The bridge returns structured errors that scripts can handle:

```json
{
  "error": "INSUFFICIENT_USDC",
  "message": "Need 1.00 USDC, have 0.50",
  "recoverable": false,
  "suggestedAction": "Fund wallet on Base with USDC"
}
```

Error codes:
- `INSUFFICIENT_USDC` — wallet doesn't have enough USDC
- `BUDGET_EXCEEDED` — request exceeds per-task or per-session limit
- `TIMEOUT` — PayToll API didn't respond in time (recoverable)
- `NETWORK_ERROR` — connection failed (recoverable)
- `INVALID_CHALLENGE` — malformed 402 response from PayToll

## Relation to Existing Wallet

This uses the same wallet derivation as `wallet.ts` in the EigenSkills
agent. The Base L2 address is derived from the same MNEMONIC used for
Ethereum mainnet operations. See [[base-chain-config]] for chain-specific
account details.

## See Also

- [[x402-protocol]] for the full payment cycle
- [[budget-management]] for spend controls enforced at signing time
- [[session-spending]] for the spend tracking data structure
- [[payment-receipts]] for the audit log
