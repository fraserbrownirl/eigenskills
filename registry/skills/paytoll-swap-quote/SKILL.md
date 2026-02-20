---
name: paytoll-swap-quote
description: >
  Get a DEX swap price quote across chains via Li.Fi aggregator. Supports
  same-chain and cross-chain swaps. Costs $0.005 per call.
version: 1.0.0
author: eigenskills
requires_env: []
execution:
  - run: node run.js {{input}}
---

# Swap Quote

Get DEX swap quote via Li.Fi.

## Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| fromChain | integer | Yes | Source chain ID (1=Ethereum, 8453=Base, 42161=Arbitrum) |
| toChain | integer | No | Destination chain ID (defaults to same chain) |
| fromToken | string | Yes | Source token address or symbol (e.g., "ETH", "USDC") |
| toToken | string | Yes | Destination token address or symbol |
| amount | string | Yes | Amount to swap (human-readable, e.g., "1.5") |
| slippage | number | No | Slippage tolerance in percent (default: 0.5%) |

## Example Input

```json
{
  "fromChain": 8453,
  "fromToken": "ETH",
  "toToken": "USDC",
  "amount": "0.1"
}
```
