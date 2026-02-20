---
name: x402-protocol
description: >
  How x402 turns HTTP 402 responses into inline micropayments. Every PayToll
  API call follows this cycle. Read this before using any endpoint skill.
---

# x402 Protocol

x402 is an HTTP-native payment protocol. Instead of API keys or subscriptions,
the server responds with `402 Payment Required` and the client pays per-request.

## The Payment Cycle

Every PayToll call follows three steps:

1. **Request** — agent sends a normal HTTP request to a PayToll endpoint
2. **Challenge** — server responds 402 with a `X-Payment` header containing:
   - `amount` (USDC wei)
   - `recipient` (Base address)
   - `token` (USDC contract on Base)
   - `nonce` (replay protection)
   - `expiry` (payment window)
3. **Payment** — agent signs the payment via [[tee-wallet-bridge]], attaches
   the signature in `X-Payment-Response` header, and retransmits the request

The `@x402/fetch` wrapper handles steps 2-3 automatically. The agent only needs
to construct the initial request; the wrapper intercepts 402s and signs.

## Key Properties

**Atomic** — payment and API response are a single HTTP round-trip (after the
initial 402 challenge). No separate "fund then call" step.

**Stateless** — no session tokens, no auth headers beyond the payment signature.
Each request is independently authenticated by its payment.

**Auditable** — every payment produces a receipt (tx hash or signed message)
that can be logged to [[payment-receipts]] for accounting.

## Pricing Model

PayToll endpoints have variable pricing. The 402 challenge tells you the exact
cost *before* you pay. The agent should:

1. Check the `amount` field against [[session-spending]] limits
2. If within budget → sign and pay automatically
3. If over budget → surface to the orchestrator for approval

## Relation to EigenSkills

In the EigenSkills architecture, x402 payments are signed by the TEE wallet
(see [[tee-wallet-bridge]]). Skill scripts never see the MNEMONIC. They
construct the request payload and delegate signing to the native module.

This is analogous to how [[clawtasks-comparison]] uses the same TEE wallet
for USDC bounty transactions on Base, but through smart contract calls rather
than HTTP payment headers.

## Further Reading

- [[base-chain-config]] for chain-specific details (RPC, contract addresses)
- [[hire-and-wait]] for the most common workflow using x402 payments
