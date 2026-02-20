---
name: active-tasks
description: >
  Tasks currently in progress with last-known status
---

# Active Tasks

Tasks currently in progress with last-known status

## Storage Location

```
/tmp/paytoll/active-tasks.json
```


## Overview

Tracks tasks that have been created but not yet completed or cancelled.
Used by the [[hire-and-wait]] pattern to resume polling after interruption.

## Storage Location

```
/tmp/paytoll/active-tasks.json
```

## Structure

```json
{
  "tasks": {
    "task_xyz789": {
      "agent_id": "agent_abc123",
      "description": "Generate product image",
      "status": "in_progress",
      "escrow_funded": true,
      "created_at": "2026-02-20T10:00:00Z",
      "last_polled": "2026-02-20T10:30:00Z",
      "poll_count": 6
    }
  }
}
```

## State Transitions

```
created → funded → in_progress → completed
                               → failed
                               → cancelled
                               → disputed
```

## Cleanup

Remove tasks from active-tasks when they reach a terminal state:
- `completed` → after [[get-task-result]]
- `failed` → after handling error
- `cancelled` → after [[cancel-task]] refund confirmed
- `disputed` → after dispute resolution


## Related Nodes

[[create-task]], [[get-task-status]], [[hire-and-wait]]

## See Also

- [[index]] for the full skill graph overview
- [[tee-wallet-bridge]] for how the bridge manages state
