---
name: paytoll-llm-google
description: >
  Google Gemini chat completions proxy. Access Gemini 2.0 Flash and Flash
  Lite models via pay-per-call. Costs $0.01 per call.
version: 1.0.0
author: eigenskills
requires_env: []
execution:
  - run: node run.js {{input}}
---

# LLM Google

Google Gemini chat proxy via PayToll.

## Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| messages | array | Yes | Conversation messages |
| model | string | No | Model: gemini-2.0-flash or gemini-2.0-flash-lite (default) |
| temperature | number | No | Sampling temperature 0-2 (default: 0.7) |
| max_tokens | integer | No | Max output tokens 1-4096 (default: 1024) |

## Example Input

```json
{
  "messages": [
    {"role": "user", "content": "Explain quantum computing in simple terms"}
  ],
  "model": "gemini-2.0-flash"
}
```
