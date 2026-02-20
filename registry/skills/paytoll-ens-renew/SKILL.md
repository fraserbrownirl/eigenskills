---
name: paytoll-ens-renew
description: >
  Build a renewal transaction for an existing ENS name. Free endpoint -
  no x402 payment required.
version: 1.0.0
author: eigenskills
requires_env: []
execution:
  - run: node run.js {{input}}
---

# ENS Renew

Build renewal transaction for an existing ENS name.

## Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| name | string | Yes | ENS name to renew (without .eth) |
| duration | integer | No | Renewal duration in seconds (default: 1 year) |

## Example Input

```json
{
  "name": "myname",
  "duration": 31536000
}
```
