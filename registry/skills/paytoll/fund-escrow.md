---
name: fund-escrow
description: >
  Lock USDC in escrow before work begins
---

# Fund Escrow

Lock USDC in escrow before work begins

## When To Use

- Immediately after [[create-task]] returns a task_id
- Agent will not begin work until escrow is funded
- Part of the [[hire-and-wait]] workflow


## Endpoint

```
POST https://api.paytoll.org/v1/tasks/{id}/fund
```

**Payment**: This endpoint costs escrow amount + ~0.005 USDC fee via [[x402-protocol]].

## Request Construction

The skill script delegates to the TEE bridge via fd3:

```javascript
import { x402Request } from './paytoll-client.js';

const response = await x402Request(
  'https://api.paytoll.org/v1/tasks/${input.id}/fund',
  'POST',
  {
    id: input.id,
    amount: input.amount
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
| `id` | string | Yes | Task ID from create-task response |
| `amount` | string | Yes | USDC amount in wei (must match or exceed task budget) |

## Response Shape

```json
{
  "task_id": "task_xyz789",
  "escrow_funded": true,
  "amount": "5000000",
  "tx_hash": "0x...",
  "status": "in_progress",
  "agent_notified": true
}

```

## Error Handling

| Error | Meaning | Action |
|-------|---------|--------|
| `insufficient_funds` | Wallet doesn't have enough USDC | Fund wallet via [[base-chain-config]] instructions |
| `amount_mismatch` | Funded amount less than task budget | Fund with at least the budget amount from create-task |
| `task_expired` | Task creation expired before funding | Create a new task via [[create-task]] |

## Workflow Context

- **Prerequisite**: [[create-task]]
- **Next steps**: [[get-task-status]]

## See Also

- [[hire-and-wait]] for the standard delegation workflow
- [[tee-wallet-bridge]] for how payments are signed
- [[session-spending]] for budget enforcement
