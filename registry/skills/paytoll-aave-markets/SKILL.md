---
name: paytoll-aave-markets
description: >
  Get overview of all Aave V3 markets with TVL and rates. Costs $0.005
  per call.
version: 1.0.0
author: eigenskills
requires_env: []
execution:
  - run: node run.js {{input}}
---

# Aave Markets

Get overview of all Aave V3 markets.

## Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| chainIds | array | No | Specific chain IDs (default: all major chains) |
| topAssetsCount | integer | No | Top assets to include per market (default: 5, max: 20) |

## Example Input

```json
{
  "chainIds": [8453, 42161],
  "topAssetsCount": 10
}
```
