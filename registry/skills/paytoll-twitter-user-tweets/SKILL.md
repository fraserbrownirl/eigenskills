---
name: paytoll-twitter-user-tweets
description: >
  Get a user's recent tweets by user ID. Can exclude replies and retweets.
  Costs $0.08 per call.
version: 1.0.0
author: eigenskills
requires_env: []
execution:
  - run: node run.js {{input}}
---

# Twitter User Tweets

Get user's recent tweets via PayToll.

## Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| userId | string | Yes | Twitter user ID |
| maxResults | integer | No | Tweets to return 5-20 (default: 10) |
| excludeReplies | boolean | No | Exclude reply tweets (default: false) |
| excludeRetweets | boolean | No | Exclude retweets (default: false) |
| nextToken | string | No | Pagination token |
| tweetFields | array | No | Fields to return |

## Example Input

```json
{
  "userId": "44196397",
  "maxResults": 10,
  "excludeRetweets": true
}
```
