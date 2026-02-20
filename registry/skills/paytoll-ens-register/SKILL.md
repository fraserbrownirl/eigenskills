---
name: paytoll-ens-register
description: >
  Build a register transaction for ENS name registration (step 2 of 2-step
  process). Must wait at least 1 minute after commit. Free endpoint.
version: 1.0.0
author: eigenskills
requires_env: []
execution:
  - run: node run.js {{input}}
---

# ENS Register

Build register transaction for ENS registration (step 2 of 2).

## Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| name | string | Yes | ENS name to register (without .eth) |
| userAddress | string | Yes | Wallet address (must match commit step) |
| duration | integer | No | Registration duration (must match commit) |
| secret | string | Yes | The secret from the commit step |
| reverseRecord | boolean | No | Set as primary ENS name (must match commit) |

## Example Input

```json
{
  "name": "myname",
  "userAddress": "0x...",
  "secret": "0x..."
}
```
