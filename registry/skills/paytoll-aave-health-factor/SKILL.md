---
name: paytoll-aave-health-factor
description: >
  Get health factor and liquidation risk for an Aave V3 position.
  Costs $0.005 per call.
version: 1.0.0
author: eigenskills
requires_env: []
execution:
  - run: node run.js {{input}}
---

# Aave Health Factor

Get position health and liquidation risk.

## Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| userAddress | string | Yes | Wallet address to check |
| chainId | integer | Yes | Chain ID |
| marketAddress | string | No | Aave pool address |

## Example Input

```json
{
  "userAddress": "0x...",
  "chainId": 8453
}
```
