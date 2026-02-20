---
name: paytoll-ens-commit
description: >
  Build a commit transaction for ENS name registration (step 1 of 2-step
  registration process). Free endpoint - no x402 payment required.
version: 1.0.0
author: eigenskills
requires_env: []
execution:
  - run: node run.js {{input}}
---

# ENS Commit

Build commit transaction for ENS registration (step 1 of 2).

## Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| name | string | Yes | ENS name to register (without .eth) |
| userAddress | string | Yes | Wallet address that will own the name |
| duration | integer | No | Registration duration in seconds (default: 1 year) |
| secret | string | No | 32-byte hex secret (auto-generated if not provided) |
| reverseRecord | boolean | No | Set as primary ENS name (default: false) |

## Example Input

```json
{
  "name": "myname",
  "userAddress": "0x..."
}
```
