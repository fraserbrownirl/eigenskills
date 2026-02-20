---
name: paytoll-twitter-post
description: >
  Post a tweet using your OAuth access token. Supports replies and quote
  tweets. Costs $0.015 per call.
version: 1.0.0
author: eigenskills
requires_env: []
execution:
  - run: node run.js {{input}}
---

# Twitter Post

Post a tweet via PayToll.

## Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| text | string | Yes | Tweet text (max 280 characters) |
| accessToken | string | Yes | OAuth 2.0 access token with tweet.write scope |
| replyToId | string | No | Tweet ID to reply to |
| quoteTweetId | string | No | Tweet ID to quote |

## Example Input

```json
{
  "text": "Hello from my AI agent!",
  "accessToken": "your_oauth_token"
}
```
