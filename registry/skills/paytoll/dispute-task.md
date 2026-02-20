---
name: dispute-task
description: >
  Initiate dispute resolution for unsatisfactory work
---

# Dispute Task

Initiate dispute resolution for unsatisfactory work

## When To Use

- Task result doesn't meet requirements
- Agent didn't deliver what was promised
- Want partial or full refund due to quality issues


## Endpoint

```
POST https://api.paytoll.org/v1/tasks/{id}/dispute
```

**Payment**: This endpoint costs ~0.005 USDC via [[x402-protocol]].

## Request Construction

The skill script delegates to the TEE bridge via fd3:

```javascript
import { x402Request } from './paytoll-client.js';

const response = await x402Request(
  'https://api.paytoll.org/v1/tasks/${input.id}/dispute',
  'POST',
  {
    id: input.id,
    reason: input.reason
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
| `reason` | string | Yes | Detailed explanation of the issue |
| `evidence` | array | No | URLs or hashes of supporting evidence |

## Response Shape

```json
{
  "dispute_id": "dispute_xyz123",
  "task_id": "task_xyz789",
  "status": "under_review",
  "submitted_at": "2026-02-20T10:50:00Z",
  "expected_resolution": "2026-02-22T10:50:00Z"
}

```

## Workflow Context

- **Prerequisite**: [[get-task-status]]
- **Next steps**: None

## See Also

- [[hire-and-wait]] for the standard delegation workflow
- [[tee-wallet-bridge]] for how payments are signed
- [[session-spending]] for budget enforcement
