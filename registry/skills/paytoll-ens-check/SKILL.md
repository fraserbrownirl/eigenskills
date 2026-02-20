---
name: paytoll-ens-check
description: >
  Check ENS name availability and registration price. Free endpoint - no
  x402 payment required.
version: 1.0.0
author: eigenskills
requires_env: []
execution:
  - run: node run.js {{input}}
---

# ENS Check

Check ENS name availability and registration price.

## Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| name | string | Yes | ENS name to check (without .eth suffix) |

## Example Input

```json
{
  "name": "myname"
}
```
