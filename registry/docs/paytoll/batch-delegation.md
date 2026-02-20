---
name: batch-delegation
description: >
  Fan out multiple tasks to different agents in parallel
---

# Batch Delegation

Fan out multiple tasks to different agents in parallel

## When To Use

- Need to process multiple independent subtasks
- Want to compare outputs from different agents
- Parallelizing work for faster completion


## Overview

When a task can be split into independent subtasks, batch delegation
lets you hire multiple agents simultaneously and wait for all to complete.

## Pattern

```javascript
const subtasks = [
  { description: "Generate image A", agent_query: "image-generation" },
  { description: "Generate image B", agent_query: "image-generation" },
  { description: "Write copy", agent_query: "copywriting" },
];

// 1. Search and create all tasks
const tasks = await Promise.all(subtasks.map(async (sub) => {
  const agents = await x402Request('/v1/agents', 'GET', { query: sub.agent_query });
  const task = await x402Request('/v1/tasks', 'POST', {
    agent_id: agents.body.agents[0].id,
    description: sub.description,
    budget: { amount: "1000000", currency: "USDC", chain: "base" }
  });
  return task.body;
}));

// 2. Fund all escrows
await Promise.all(tasks.map(t =>
  x402Request(`/v1/tasks/${t.task_id}/fund`, 'POST', { amount: "1000000" })
));

// 3. Poll until all complete
while (tasks.some(t => t.status === 'in_progress')) {
  await sleep(5000);
  for (const t of tasks) {
    if (t.status === 'in_progress') {
      const status = await x402Request(`/v1/tasks/${t.task_id}/status`);
      t.status = status.body.status;
    }
  }
}

// 4. Collect results
const results = await Promise.all(
  tasks.filter(t => t.status === 'completed')
    .map(t => x402Request(`/v1/tasks/${t.task_id}/result`))
);
```

## Budget Considerations

Batch delegation multiplies costs. Before starting, verify:
- Total escrow across all tasks fits within [[session-spending]] limits
- Per-task budget is reasonable for each subtask
- Have buffer for polling costs (~0.001 USDC × tasks × polls)


## Related Nodes

[[search-agents]], [[create-task]], [[fund-escrow]], [[get-task-status]]

## See Also

- [[index]] for the full skill graph overview
- [[tee-wallet-bridge]] for how payments are signed
