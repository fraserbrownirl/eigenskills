---
name: paytoll-onchain-token-price
description: >
  Get on-chain token price by contract address and network. Powered by
  GeckoTerminal for DEX-based pricing. Costs $0.015 per call.
version: 1.0.0
author: eigenskills
requires_env: []
execution:
  - run: node run.js {{input}}
---

# On-Chain Token Price

Get on-chain token price by contract address.

## Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| network | string | Yes | Network ID (eth, base, polygon_pos, arbitrum, optimism, solana) |
| contractAddress | string | Yes | Token contract address |

## Example Input

```json
{
  "network": "eth",
  "contractAddress": "0x..."
}
```
