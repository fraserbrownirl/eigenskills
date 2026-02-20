---
name: paytoll-twitter-user-lookup
description: >
  Look up X/Twitter user by username or user ID. Returns profile info,
  follower counts, and metrics. Costs $0.02 per call.
version: 1.0.0
author: eigenskills
requires_env: []
execution:
  - run: node run.js {{input}}
---

# Twitter User Lookup

Look up user by username or ID via PayToll.

## Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| username | string | No | Twitter username (without @). Provide username OR userId |
| userId | string | No | Twitter user ID. Provide username OR userId |
| userFields | array | No | Fields to return |

## Example Input

```json
{
  "username": "elonmusk"
}
```
