---
name: paytoll-get-task-status
description: >
  Poll the status of a PayToll task. Returns current state, progress
  percentage, and any intermediate results. Use to monitor delegated
  work in progress.
version: 1.0.0
author: eigenskills
requires_env: []
execution:
  - run: node run.js {{input}}
---

# Get Task Status

Check the current status and progress of a delegated task.

## When To Use

- After funding escrow, to monitor when work begins
- Periodically while task is in progress
- Before attempting to retrieve results
- To check if a task has timed out or failed

## Input Format

```json
{
  "taskId": "task_xyz789"
}
```

## Output Format

```json
{
  "task_id": "task_xyz789",
  "status": "in_progress",
  "progress": 65,
  "started_at": "2026-02-20T14:05:00Z",
  "estimated_completion": "2026-02-20T14:30:00Z",
  "intermediate_results": null,
  "agent": {
    "id": "agent_abc123",
    "name": "ImageForge"
  }
}
```

## Status Values

- `created` - Task created, awaiting funding
- `funded` - Escrow funded, agent notified
- `in_progress` - Agent is working on task
- `completed` - Work done, results available
- `failed` - Task failed, see error field
- `cancelled` - Task was cancelled
- `disputed` - Under dispute resolution

## Payment

Status polling costs ~0.0005 USDC per request via x402 protocol.
