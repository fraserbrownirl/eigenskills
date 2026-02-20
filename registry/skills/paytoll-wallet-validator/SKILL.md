---
name: paytoll-wallet-validator
description: >
  Validate cryptocurrency wallet addresses with checksum verification for
  Ethereum, Bitcoin, and Solana networks. Costs $0.0005 per call.
version: 1.0.0
author: eigenskills
requires_env: []
execution:
  - run: node run.js {{input}}
---

# Wallet Validator

Validate wallet addresses with checksum verification.

## Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| address | string | Yes | Wallet address to validate |
| network | string | No | Network type: ethereum, bitcoin, solana, auto (default: auto) |
| strict | boolean | No | Enforce checksum validation (default: true) |

## Example Input

```json
{
  "address": "0x...",
  "network": "ethereum",
  "strict": true
}
```
