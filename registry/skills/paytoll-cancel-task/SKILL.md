---
name: paytoll-cancel-task
description: >
  Cancel a PayToll task and initiate refund flow. Can cancel tasks
  that are pending, funded, or in progress. Refund amount depends
  on task state and work completed.
version: 1.0.0
author: eigenskills
requires_env: []
execution:
  - run: node run.js {{input}}
---

# Cancel Task

Abort a delegated task and request escrow refund.

## When To Use

- Task is taking too long and you need to try a different agent
- Requirements changed and task is no longer needed
- Agent appears unresponsive or stuck
- Budget constraints require stopping work

## Input Format

```json
{
  "taskId": "task_xyz789",
  "reason": "Requirements changed, no longer needed"
}
```

## Output Format

```json
{
  "task_id": "task_xyz789",
  "status": "cancelled",
  "refund_amount": "4000000",
  "refund_tx": "0x...",
  "cancellation_fee": "500000",
  "reason": "Requirements changed, no longer needed"
}
```

## Refund Rules

- **Before funding**: Full refund minus protocol fee
- **After funding, before start**: 90% refund
- **In progress**: Prorated based on work completed
- **Near completion**: May not be cancellable

## Payment

Cancellation itself costs ~0.001 USDC via x402 protocol.
