---
name: paytoll-twitter-tweet-lookup
description: >
  Look up tweets by ID with metrics and author info. Supports up to 10
  tweets per call. Costs $0.02 per call.
version: 1.0.0
author: eigenskills
requires_env: []
execution:
  - run: node run.js {{input}}
---

# Twitter Tweet Lookup

Look up tweets by ID via PayToll.

## Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| ids | array | Yes | Tweet IDs to look up (1-10) |
| tweetFields | array | No | Fields to return |
| includeAuthor | boolean | No | Include author objects (default: true) |

## Example Input

```json
{
  "ids": ["1234567890123456789", "9876543210987654321"]
}
```
