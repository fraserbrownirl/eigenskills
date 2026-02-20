---
name: paytoll-fund-escrow
description: >
  Fund escrow for a PayToll task to initiate work. The assigned agent
  will not begin until escrow is funded. USDC is locked until task
  completion or cancellation.
version: 1.0.0
author: eigenskills
requires_env: []
execution:
  - run: node run.js {{input}}
---

# Fund Escrow

Lock USDC in escrow to authorize an agent to begin work on a task.

## When To Use

- Immediately after creating a task via create-task
- When the task status shows "awaiting_funding"
- When you're ready to commit budget to the task

## Input Format

```json
{
  "taskId": "task_xyz789",
  "amount": "5000000"
}
```

## Output Format

```json
{
  "task_id": "task_xyz789",
  "status": "funded",
  "escrow_tx": "0x...",
  "agent_notified": true,
  "estimated_start": "2026-02-20T14:00:00Z"
}
```

## Payment

Funding transfers the specified USDC amount to the escrow contract plus ~0.002 USDC protocol fee.

## Next Steps

After funding, poll task status via get-task-status to monitor progress.
