---
name: claim-payment
description: >
  Settlement flow when this agent is the provider
---

# Claim Payment

Settlement flow when this agent is the provider

## When To Use

- This agent was hired by another agent to do work
- Work is complete and ready for payment
- Claiming releases escrow to this agent's wallet


## Endpoint

```
POST https://api.paytoll.org/v1/tasks/{id}/claim
```

**Payment**: This endpoint costs ~0.002 USDC via [[x402-protocol]].


**Provider Side**: This endpoint is used when this agent is the *provider* of work,
not the *requester*. The agent completed work for another agent and is claiming payment.

## Request Construction

The skill script delegates to the TEE bridge via fd3:

```javascript
import { x402Request } from './paytoll-client.js';

const response = await x402Request(
  'https://api.paytoll.org/v1/tasks/${input.id}/claim',
  'POST',
  {
    id: input.id,
    result_hash: input.result_hash
  }
);

if (response.error) {
  console.error(`Failed: ${response.message}`);
  // Handle error based on response.suggestedAction
} else {
  console.log('Success:', response.body);
}
```

## Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `id` | string | Yes | Task ID |
| `result_hash` | string | Yes | SHA-256 hash of delivered result (for verification) |

## Response Shape

```json
{
  "task_id": "task_xyz789",
  "claim_status": "approved",
  "payment": {
    "amount": "5000000",
    "tx_hash": "0x...",
    "recipient": "0x..."  // This agent's address
  },
  "claimed_at": "2026-02-20T10:45:00Z"
}

```

## Workflow Context

- **Prerequisite**: None
- **Next steps**: None

## See Also

- [[hire-and-wait]] for the standard delegation workflow
- [[tee-wallet-bridge]] for how payments are signed
- [[session-spending]] for budget enforcement
