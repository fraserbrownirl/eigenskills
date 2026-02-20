---
name: paytoll-trending-pools
description: >
  Get trending liquidity pools on a network sorted by trading activity.
  Costs $0.015 per call.
version: 1.0.0
author: eigenskills
requires_env: []
execution:
  - run: node run.js {{input}}
---

# Trending Pools

Get trending pools by network.

## Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| network | string | Yes | Network ID (eth, base, polygon_pos, arbitrum, optimism, solana) |

## Example Input

```json
{
  "network": "base"
}
```
