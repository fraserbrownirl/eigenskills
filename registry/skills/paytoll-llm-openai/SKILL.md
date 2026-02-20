---
name: paytoll-llm-openai
description: >
  OpenAI chat completions proxy. Access GPT-4o mini and GPT-3.5 Turbo
  models via pay-per-call. Costs $0.01 per call.
version: 1.0.0
author: eigenskills
requires_env: []
execution:
  - run: node run.js {{input}}
---

# LLM OpenAI

OpenAI GPT chat proxy via PayToll.

## Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| messages | array | Yes | Conversation messages |
| model | string | No | Model: gpt-4o-mini (default) or gpt-3.5-turbo |
| temperature | number | No | Sampling temperature 0-2 (default: 0.7) |
| max_tokens | integer | No | Max output tokens 1-4096 (default: 1024) |

## Example Input

```json
{
  "messages": [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "Write a haiku about programming"}
  ]
}
```
