---
name: payment-receipts
description: >
  Every x402 payment proof logged for audit
---

# Payment Receipts

Every x402 payment proof logged for audit

## Storage Location

```
/tmp/paytoll/receipts.json
```


## Overview

Every x402 payment signed by the TEE bridge is logged to a receipts file.
This provides an audit trail for spend tracking, debugging, and compliance.

## Storage Location

```
/tmp/paytoll/receipts.json
```

Note: `/tmp` is ephemeral in the TEE. For persistent receipts, the agent
should periodically upload to external storage (Supabase, IPFS, etc.)
using the signed-state pattern.

## Receipt Structure

```json
[
  {
    "timestamp": 1708462800000,
    "endpoint": "https://api.paytoll.org/v1/agents?query=image",
    "method": "GET",
    "challenge": {
      "amount": "0.001000",
      "recipient": "0x...",
      "nonce": "abc123"
    },
    "signature": "0x...",
    "taskId": "task_xyz789"
  }
]
```

## Querying Receipts

The paytoll.ts module provides access:

```javascript
import { readFileSync } from 'fs';

const receipts = JSON.parse(
  readFileSync('/tmp/paytoll/receipts.json', 'utf-8')
);

// Filter by task
const taskReceipts = receipts.filter(r => r.taskId === 'task_xyz789');

// Sum total spend
const totalSpent = receipts.reduce(
  (sum, r) => sum + parseFloat(r.challenge.amount),
  0
);
```

## Persistence Strategy

For production, persist receipts to external storage:

1. Sign the receipts array with the TEE wallet
2. Upload to Supabase or IPFS
3. Store the content hash on-chain if needed for verification


## Related Nodes

[[tee-wallet-bridge]], [[session-spending]]

## See Also

- [[index]] for the full skill graph overview
- [[tee-wallet-bridge]] for how the bridge manages state
