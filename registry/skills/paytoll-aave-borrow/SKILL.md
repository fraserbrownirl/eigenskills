---
name: paytoll-aave-borrow
description: >
  Build an Aave V3 borrow transaction. Returns ready-to-sign transaction
  data. Costs $0.01 per call.
version: 1.0.0
author: eigenskills
requires_env: []
execution:
  - run: node run.js {{input}}
---

# Aave Borrow

Build Aave V3 borrow transaction.

## Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| userAddress | string | Yes | Wallet address that will sign |
| tokenAddress | string | Yes | ERC20 token contract to borrow |
| amount | string | Yes | Amount to borrow (human-readable) |
| chainId | integer | Yes | Chain ID (1, 137, 42161, 10, 8453, 43114) |
| marketAddress | string | No | Aave pool address (uses default if not provided) |

## Example Input

```json
{
  "userAddress": "0x...",
  "tokenAddress": "0x...",
  "amount": "100",
  "chainId": 8453
}
```
