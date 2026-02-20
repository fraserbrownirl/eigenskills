---
name: paytoll-aave-user-positions
description: >
  Get all Aave V3 positions for a wallet address across chains.
  Costs $0.01 per call.
version: 1.0.0
author: eigenskills
requires_env: []
execution:
  - run: node run.js {{input}}
---

# Aave User Positions

Get all Aave positions for a wallet.

## Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| userAddress | string | Yes | Wallet address to check |
| chainIds | array | No | Specific chain IDs to query |

## Example Input

```json
{
  "userAddress": "0x..."
}
```
