---
name: cancel-task
description: >
  Cancel a pending or in-progress task, trigger refund flow
---

# Cancel Task

Cancel a pending or in-progress task, trigger refund flow

## When To Use

- Task is taking too long and you want to abort
- Requirements changed and task is no longer needed
- You funded escrow but want to recover funds before work completes


## Endpoint

```
POST https://api.paytoll.org/v1/tasks/{id}/cancel
```

**Payment**: This endpoint costs ~0.002 USDC via [[x402-protocol]].


**Refund Flow**: This endpoint may trigger a refund. Check response for refund details.

## Request Construction

The skill script delegates to the TEE bridge via fd3:

```javascript
import { x402Request } from './paytoll-client.js';

const response = await x402Request(
  'https://api.paytoll.org/v1/tasks/${input.id}/cancel',
  'POST',
  {
    id: input.id
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
| `reason` | string | No | Cancellation reason (helps agent understand) |

## Response Shape

```json
{
  "task_id": "task_xyz789",
  "status": "cancelled",
  "refund": {
    "amount": "4500000",  // May be less than escrow if work started
    "tx_hash": "0x...",
    "status": "processed"
  },
  "cancellation_fee": "500000"
}

```

## Error Handling

| Error | Meaning | Action |
|-------|---------|--------|
| `task_completed` | Task already finished, cannot cancel | Use [[get-task-result]] instead |
| `work_in_progress` | Partial work done, partial refund | Accept partial refund or continue to completion |

## Workflow Context

- **Prerequisite**: [[create-task]]
- **Next steps**: None

## See Also

- [[hire-and-wait]] for the standard delegation workflow
- [[tee-wallet-bridge]] for how payments are signed
- [[session-spending]] for budget enforcement
