---
name: paytoll-aave-repay
description: >
  Build an Aave V3 repay transaction. Returns ready-to-sign transaction
  data. Costs $0.01 per call.
version: 1.0.0
author: eigenskills
requires_env: []
execution:
  - run: node run.js {{input}}
---

# Aave Repay

Build Aave V3 repay transaction.

## Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| userAddress | string | Yes | Wallet address that will sign |
| tokenAddress | string | Yes | ERC20 token contract to repay |
| amount | string | No | Amount to repay (required unless max is true) |
| max | boolean | No | If true, repay entire debt position |
| chainId | integer | Yes | Chain ID |
| marketAddress | string | No | Aave pool address |

## Example Input

```json
{
  "userAddress": "0x...",
  "tokenAddress": "0x...",
  "max": true,
  "chainId": 8453
}
```
