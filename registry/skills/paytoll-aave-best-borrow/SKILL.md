---
name: paytoll-aave-best-borrow
description: >
  Find the lowest Aave V3 borrow APR across all chains for a given asset.
  Costs $0.01 per call.
version: 1.0.0
author: eigenskills
requires_env: []
execution:
  - run: node run.js {{input}}
---

# Aave Best Borrow

Find lowest borrow APR across chains.

## Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| asset | string | Yes | Asset symbol (e.g., USDC, ETH, WBTC, DAI) |
| chainIds | array | No | Specific chain IDs to query |
| minLiquidity | number | No | Minimum available liquidity in USD |

## Example Input

```json
{
  "asset": "USDC"
}
```
