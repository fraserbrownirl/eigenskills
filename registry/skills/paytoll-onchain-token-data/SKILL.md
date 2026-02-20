---
name: paytoll-onchain-token-data
description: >
  Get comprehensive on-chain token data including price, supply, FDV, market
  cap, and top pools. Powered by GeckoTerminal. Costs $0.015 per call.
version: 1.0.0
author: eigenskills
requires_env: []
execution:
  - run: node run.js {{input}}
---

# On-Chain Token Data

Get comprehensive on-chain token data by contract address.

## Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| network | string | Yes | Network ID (eth, base, polygon_pos, arbitrum, optimism, solana) |
| contractAddress | string | Yes | Token contract address |

## Example Input

```json
{
  "network": "base",
  "contractAddress": "0x..."
}
```
