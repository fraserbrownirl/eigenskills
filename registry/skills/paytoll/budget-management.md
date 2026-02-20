---
name: budget-management
description: >
  Track cumulative spend, enforce per-task and per-session limits
---

# Budget Management

Track cumulative spend, enforce per-task and per-session limits

## When To Use

- Setting up spend controls for autonomous operation
- Preventing runaway costs from buggy skill logic
- Enforcing organizational budget policies


## Overview

The TEE bridge enforces budget limits before signing any x402 payment.
This prevents skill scripts from spending more than authorized.

## Limit Hierarchy

```
Per-Request ≤ Per-Task ≤ Per-Session ≤ Wallet Balance
```

| Limit | Default | Purpose |
|-------|---------|---------|
| Per-request | 1.00 USDC | Prevents accidental large single payments |
| Per-task | 10.00 USDC | Caps total spend on a single task |
| Per-session | 50.00 USDC | Hard stop for entire agent session |

## Configuring Limits

The orchestrator sets limits at session start:

```javascript
// In orchestrator, before starting skill execution
import { resetSession } from './paytoll.js';

resetSession({
  perRequestMaxUsdc: "2.00",
  perTaskMaxUsdc: "25.00",
  perSessionMaxUsdc: "100.00"
});
```

## Budget Exceeded Flow

When a payment would exceed limits, the bridge returns an error instead
of signing:

```json
{
  "error": "BUDGET_EXCEEDED",
  "message": "Payment would exceed session limit: 48.50 + 3.00 > 50.00 USDC",
  "recoverable": false,
  "suggestedAction": "Request budget increase from orchestrator"
}
```

The skill should surface this to the orchestrator for human approval.

## Monitoring Spend

Query current spend via the bridge:

```javascript
import { getSessionSpending } from './paytoll.js';

const spending = getSessionSpending();
console.log(`Spent: ${spending.spent.totalUsdc} USDC`);
console.log(`Remaining: ${
  parseFloat(spending.limits.perSessionMaxUsdc) -
  parseFloat(spending.spent.totalUsdc)
} USDC`);
```


## Related Nodes

[[session-spending]], [[payment-receipts]], [[tee-wallet-bridge]]

## See Also

- [[index]] for the full skill graph overview
- [[tee-wallet-bridge]] for how payments are signed
