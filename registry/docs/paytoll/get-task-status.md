---
name: get-task-status
description: >
  Poll for task progress, intermediate results, or completion
---

# Get Task Status

Poll for task progress, intermediate results, or completion

## When To Use

- After [[fund-escrow]] to wait for completion
- Part of the [[hire-and-wait]] polling loop
- To check if task is still in progress or has completed


## Endpoint

```
GET https://api.paytoll.org/v1/tasks/{id}/status
```

**Payment**: This endpoint costs ~0.001 USDC via [[x402-protocol]].


**Polling Endpoint**: Use exponential backoff (5s initial, 60s max, 2x factor).
Register task in [[active-tasks]] and check on next opportunity rather than blocking.

## Request Construction

The skill script delegates to the TEE bridge via fd3:

```javascript
import { x402Request } from './paytoll-client.js';

const response = await x402Request(
  'https://api.paytoll.org/v1/tasks/${input.id}/status',
  'GET'
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

## Response Shape

```json
{
  "task_id": "task_xyz789",
  "status": "in_progress",  // or "completed", "failed", "cancelled", "disputed"
  "progress_percent": 65,
  "intermediate_result": "First draft generated...",
  "updated_at": "2026-02-20T10:30:00Z",
  "estimated_completion": "2026-02-20T10:35:00Z"
}

```

## Decision Flow

Based on status field:
- `in_progress` → continue polling with exponential backoff
- `completed` → proceed to [[get-task-result]]
- `failed` → check error details, consider [[dispute-task]] or [[cancel-task]]
- `cancelled` → check if refund was issued
- `disputed` → await dispute resolution


## Workflow Context

- **Prerequisite**: [[fund-escrow]]
- **Next steps**: [[get-task-result]], [[cancel-task]], [[dispute-task]]

## See Also

- [[hire-and-wait]] for the standard delegation workflow
- [[tee-wallet-bridge]] for how payments are signed
- [[session-spending]] for budget enforcement
