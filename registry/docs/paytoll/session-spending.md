---
name: session-spending
description: >
  Tracks cumulative USDC spend per agent session. Enforces per-task and
  per-session budget limits. Checked before every x402 payment signature.
---

# Session Spending

Every x402 payment signature passes through a budget check before the
[[tee-wallet-bridge]] signs.

## Spend Tracking

Maintained as a JSON file in the ops directory:

```json
{
  "session_id": "sess_20260220_0812",
  "started_at": "2026-02-20T08:12:00Z",
  "limits": {
    "per_task_max_usdc": "10.00",
    "per_session_max_usdc": "50.00",
    "per_request_max_usdc": "1.00"
  },
  "spent": {
    "total_usdc": "3.47",
    "by_category": {
      "search": "0.012",
      "task_creation": "0.025",
      "escrow": "3.40",
      "polling": "0.033"
    },
    "by_task": {
      "task_xyz789": "3.42",
      "task_abc456": "0.05"
    }
  },
  "transactions": [
    {
      "timestamp": "2026-02-20T08:15:32Z",
      "endpoint": "/v1/agents",
      "amount_usdc": "0.001",
      "tx_hash": "0x..."
    }
  ]
}
```

## Budget Enforcement

The [[tee-wallet-bridge]] checks three limits before signing:

1. **Per-request**: Is this single payment within `per_request_max_usdc`?
2. **Per-task**: Would this payment push the task's total over `per_task_max_usdc`?
3. **Per-session**: Would this payment push session total over `per_session_max_usdc`?

If any limit is exceeded, the bridge **refuses to sign** and returns an
error to the skill script. The agent must then:

- Surface the budget constraint to the orchestrator
- Request approval for a limit increase
- Or abort the current operation

## Defaults

These defaults can be overridden by the orchestrator at session start:

| Limit | Default | Rationale |
|-------|---------|-----------|
| Per-request | 1.00 USDC | Prevents accidental large payments |
| Per-task | 10.00 USDC | Reasonable ceiling for most agent tasks |
| Per-session | 50.00 USDC | Hard stop for runaway spending |

## Gas Balance Monitoring

In addition to USDC spend, this tracker monitors ETH balance on Base
for gas (see [[base-chain-config]]). Alert threshold: 0.0005 ETH.

## See Also

- [[budget-management]] for higher-level budget strategy
- [[payment-receipts]] for the full audit log
- [[tee-wallet-bridge]] for where enforcement happens
