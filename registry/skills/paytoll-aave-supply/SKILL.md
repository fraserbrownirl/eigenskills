---
name: paytoll-aave-supply
description: >
  Build an Aave V3 supply (deposit) transaction. Returns ready-to-sign
  transaction data. Costs $0.01 per call.
version: 1.0.0
author: eigenskills
requires_env: []
execution:
  - run: node run.js {{input}}
---

# Aave Supply

Build Aave V3 supply (deposit) transaction.

## Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| userAddress | string | Yes | Wallet address that will sign |
| tokenAddress | string | Yes | ERC20 token contract to supply |
| amount | string | Yes | Amount to supply (human-readable) |
| chainId | integer | Yes | Chain ID |
| marketAddress | string | No | Aave pool address |

## Example Input

```json
{
  "userAddress": "0x...",
  "tokenAddress": "0x...",
  "amount": "1000",
  "chainId": 8453
}
```
