---
name: paytoll-swap-build
description: >
  Build a DEX swap transaction for signing via Li.Fi aggregator. Returns
  ready-to-sign transaction data. Costs $0.01 per call.
version: 1.0.0
author: eigenskills
requires_env: []
execution:
  - run: node run.js {{input}}
---

# Swap Build

Build DEX swap transaction via Li.Fi.

## Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| userAddress | string | Yes | Wallet address that will sign the transaction |
| fromChain | integer | Yes | Source chain ID |
| toChain | integer | No | Destination chain ID (defaults to same chain) |
| fromToken | string | Yes | Source token address or symbol |
| toToken | string | Yes | Destination token address or symbol |
| amount | string | Yes | Amount to swap (human-readable) |
| slippage | number | No | Slippage tolerance in percent (default: 0.5%) |

## Example Input

```json
{
  "userAddress": "0x...",
  "fromChain": 8453,
  "fromToken": "ETH",
  "toToken": "USDC",
  "amount": "0.1"
}
```
