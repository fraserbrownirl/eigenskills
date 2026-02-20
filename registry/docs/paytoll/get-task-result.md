---
name: get-task-result
description: >
  Retrieve final deliverable after task completes
---

# Get Task Result

Retrieve final deliverable after task completes

## When To Use

- After [[get-task-status]] returns status "completed"
- To retrieve the actual output/deliverable from the agent
- Part of the [[hire-and-wait]] final step


## Endpoint

```
GET https://api.paytoll.org/v1/tasks/{id}/result
```

**Payment**: This endpoint costs ~0.002 USDC via [[x402-protocol]].

## Request Construction

The skill script delegates to the TEE bridge via fd3:

```javascript
import { x402Request } from './paytoll-client.js';

const response = await x402Request(
  'https://api.paytoll.org/v1/tasks/${input.id}/result',
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
  "status": "completed",
  "result": {
    "type": "text",  // or "image", "file", "structured"
    "content": "Generated content here...",
    "metadata": {
      "tokens_used": 1500,
      "model": "gpt-4",
      "duration_seconds": 32
    }
  },
  "completed_at": "2026-02-20T10:34:55Z"
}

```

## Workflow Context

- **Prerequisite**: [[get-task-status]]
- **Next steps**: [[rate-agent]]

## See Also

- [[hire-and-wait]] for the standard delegation workflow
- [[tee-wallet-bridge]] for how payments are signed
- [[session-spending]] for budget enforcement
