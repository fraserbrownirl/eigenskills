---
title: paytoll
pages: 3
tokens_estimate: 9910
sections:
  - title: "PayToll - APIs for AI Agents"
    source: https://www.paytoll.io/
    line: 15
  - title: "Pricing - PayToll"
    source: https://www.paytoll.io/pricing
    line: 292
  - title: "API Documentation - PayToll"
    source: https://www.paytoll.io/docs
    line: 649
---

<document>
<source>https://www.paytoll.io/</source>
<title>PayToll - APIs for AI Agents</title>
<content>
# PayToll  APIs for AI Agents

Start free. Then pay per call when you scale.

50 free calls/day, then USDC on Base.

[Get Started Free](https://www.paytoll.io/docs)

31

API Endpoints

$0.001

Starting Price

<1s

Avg Response

## See How It Works

From request to payment to response — in seconds.

AI Agents Need APIs

API Key Required

X

OAuth2 Flow

X

Credit Card on File

X

Human Signup

X

0:03 / 0:37

## How It Works

Free to try, pay-as-you-go to scale. No accounts, no API keys, no monthly bills.

### 1\. Start Free

Call a free-tier endpoint and get an immediate response. No wallet, account, or API key required.

![USDC](https://www.paytoll.io/usdc.svg?dpl=dpl_BVr1i8dzfjKJwc9BUv7jVckmDYqR)

### 2\. Pay When Needed

After free calls are exhausted or for paid-only endpoints, use x402 payment with USDC on Base.

### 3\. Get Results

Once payment is verified, your request is processed and you receive the API response immediately.

## Available Endpoints

DeFi data, crypto utilities, social APIs, and LLM access — all with a single USDC payment.

Crypto$0.01

![](https://www.paytoll.io/logos/aave.svg?dpl=dpl_BVr1i8dzfjKJwc9BUv7jVckmDYqR)

### aave-best-borrow

Find lowest Aave V3 borrow APR across all chains

`POST /v1/aave/best-borrow`

Crypto$0.01

![](https://www.paytoll.io/logos/aave.svg?dpl=dpl_BVr1i8dzfjKJwc9BUv7jVckmDYqR)

### aave-best-yield

Find best Aave V3 supply APY across all chains

`POST /v1/aave/best-yield`

Crypto$0.015

![](https://www.paytoll.io/logos/ethereum.svg?dpl=dpl_BVr1i8dzfjKJwc9BUv7jVckmDYqR)

### crypto-price

Get real-time crypto prices for any coin

`POST /v1/crypto/price`

CryptoFree

![](https://www.paytoll.io/logos/ens.svg?dpl=dpl_BVr1i8dzfjKJwc9BUv7jVckmDYqR)

### ens-check

Check ENS name availability and registration price

`POST /v1/ens/check`

AI$0.01

![](https://www.paytoll.io/logos/openai.svg?dpl=dpl_BVr1i8dzfjKJwc9BUv7jVckmDYqR)

### llm-openai

OpenAI chat completions proxy — GPT-4o mini and GPT-3.5 Turbo

`POST /v1/ai/openai/chat`

Social$0.08

![](https://www.paytoll.io/logos/x.svg?dpl=dpl_BVr1i8dzfjKJwc9BUv7jVckmDYqR)

### twitter-search

Search recent tweets (last 7 days) on X/Twitter

`POST /v1/twitter/search`

[View all 31 endpoints](https://www.paytoll.io/docs)

## Why PayToll?

The simplest way for agents and apps to access paid APIs.

### No API Keys

No registration, no OAuth flows, no key management. Payment is the authentication.

### Pay Only For What You Use

No subscriptions, no monthly minimums. Each API call is priced individually.

### Built for AI Agents

Designed for autonomous agents that need programmatic access to services.

### Instant Settlement

Payments settle on Base L2 in seconds, not minutes. Low gas, high throughput.

### Non-Custodial

We never hold your funds. Payments go directly from your wallet to ours.

### Fast Settlement

Payments settle on Base L2 in seconds. Low gas fees, high throughput.

## Works with Any MCP Client

Add PayToll as an MCP server. Your AI assistant gets DeFi, swaps, bridges, Twitter, on-chain data, and LLM access as native tools.

MCP

[Claude](https://claude.ai/download) [Cursor](https://cursor.com/) [OpenClaw](https://openclaw.ai/)

claude\_desktop\_config.json

```
{
  "mcpServers": {
    "paytoll": {
      "command": "npx",
      "args": ["-y", "paytoll-mcp"],
      "env": {
        "PAYTOLL_API_URL": "https://api.paytoll.io"
      }
    }
  }
}
```

### 27 Tools, Zero Config

Every PayToll endpoint becomes a native tool. DeFi, swaps, bridges, Twitter, on-chain data, and LLMs — all via MCP.

### Automatic Payments

The MCP server handles x402 payment signing transparently. Your agent just calls tools.

### Any MCP Client

Standard MCP protocol over stdio. If your agent speaks MCP, it speaks PayToll.

### 30-Second Setup

Paste the JSON config into your MCP client. That's it. All tools are live.

## Simple Integration

Standard HTTP requests with automatic payment handling.

TypeScript

cURLMCP (Claude Desktop)

```
import { wrapFetchWithPayment } from "@x402/fetch";
import { http, createWalletClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

// Set up wallet + x402 payment wrapper
const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);
const walletClient = createWalletClient({ account, chain: baseSepolia, transport: http() });
const fetchWithPayment = wrapFetchWithPayment(fetch, walletClient);

// Make a paid API call — payment handled automatically
const response = await fetchWithPayment("https://api.paytoll.io/v1/crypto/price", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ symbol: "ETH" }),
});

const data = await response.json();
// { symbol: "ETH", price: 3245.67, currency: "USD" }
```

## Simple Pricing

Pay exactly what each call costs. No hidden fees.

| Endpoint | Category | Price |
| --- | --- | --- |
| ![](https://www.paytoll.io/logos/aave.svg?dpl=dpl_BVr1i8dzfjKJwc9BUv7jVckmDYqR)<br>aave-best-borrow<br>/v1/aave/best-borrow | Crypto | $0.01 |
| ![](https://www.paytoll.io/logos/aave.svg?dpl=dpl_BVr1i8dzfjKJwc9BUv7jVckmDYqR)<br>aave-best-yield<br>/v1/aave/best-yield | Crypto | $0.01 |
| ![](https://www.paytoll.io/logos/aave.svg?dpl=dpl_BVr1i8dzfjKJwc9BUv7jVckmDYqR)<br>aave-borrow<br>/v1/aave/borrow | Crypto | $0.01 |
| ![](https://www.paytoll.io/logos/aave.svg?dpl=dpl_BVr1i8dzfjKJwc9BUv7jVckmDYqR)<br>aave-health-factor<br>/v1/aave/health-factor | Crypto | $0.005 |
| ![](https://www.paytoll.io/logos/aave.svg?dpl=dpl_BVr1i8dzfjKJwc9BUv7jVckmDYqR)<br>aave-markets<br>/v1/aave/markets | Crypto | $0.005 |
| ![](https://www.paytoll.io/logos/aave.svg?dpl=dpl_BVr1i8dzfjKJwc9BUv7jVckmDYqR)<br>aave-repay<br>/v1/aave/repay | Crypto | $0.01 |
| ![](https://www.paytoll.io/logos/aave.svg?dpl=dpl_BVr1i8dzfjKJwc9BUv7jVckmDYqR)<br>aave-supply<br>/v1/aave/supply | Crypto | $0.01 |
| ![](https://www.paytoll.io/logos/aave.svg?dpl=dpl_BVr1i8dzfjKJwc9BUv7jVckmDYqR)<br>aave-user-positions<br>/v1/aave/user-positions | Crypto | $0.01 |
| ![](https://www.paytoll.io/logos/aave.svg?dpl=dpl_BVr1i8dzfjKJwc9BUv7jVckmDYqR)<br>aave-withdraw<br>/v1/aave/withdraw | Crypto | $0.01 |
| ![](https://www.paytoll.io/logos/ethereum.svg?dpl=dpl_BVr1i8dzfjKJwc9BUv7jVckmDYqR)<br>crypto-price<br>/v1/crypto/price | Crypto | $0.015 |
| ![](https://www.paytoll.io/logos/ens.svg?dpl=dpl_BVr1i8dzfjKJwc9BUv7jVckmDYqR)<br>ens-check<br>/v1/ens/check | Crypto | $0 |
| ![](https://www.paytoll.io/logos/ens.svg?dpl=dpl_BVr1i8dzfjKJwc9BUv7jVckmDYqR)<br>ens-commit<br>/v1/ens/commit | Crypto | $0 |
| ![](https://www.paytoll.io/logos/ens.svg?dpl=dpl_BVr1i8dzfjKJwc9BUv7jVckmDYqR)<br>ens-lookup<br>/v1/crypto/ens | Crypto | $0.001 |
| ![](https://www.paytoll.io/logos/ens.svg?dpl=dpl_BVr1i8dzfjKJwc9BUv7jVckmDYqR)<br>ens-register<br>/v1/ens/register | Crypto | $0 |
| ![](https://www.paytoll.io/logos/ens.svg?dpl=dpl_BVr1i8dzfjKJwc9BUv7jVckmDYqR)<br>ens-renew<br>/v1/ens/renew | Crypto | $0 |
| ![](https://www.paytoll.io/logos/ethereum.svg?dpl=dpl_BVr1i8dzfjKJwc9BUv7jVckmDYqR)<br>onchain-token-data<br>/v1/crypto/onchain/token-data | Crypto | $0.015 |
| ![](https://www.paytoll.io/logos/ethereum.svg?dpl=dpl_BVr1i8dzfjKJwc9BUv7jVckmDYqR)<br>onchain-token-price<br>/v1/crypto/onchain/token-price | Crypto | $0.015 |
| ![](https://www.paytoll.io/logos/ethereum.svg?dpl=dpl_BVr1i8dzfjKJwc9BUv7jVckmDYqR)<br>search-pools<br>/v1/crypto/onchain/search-pools | Crypto | $0.015 |
| ![](https://www.paytoll.io/logos/ethereum.svg?dpl=dpl_BVr1i8dzfjKJwc9BUv7jVckmDYqR)<br>swap-build<br>/v1/swap/build | Crypto | $0.01 |
| ![](https://www.paytoll.io/logos/ethereum.svg?dpl=dpl_BVr1i8dzfjKJwc9BUv7jVckmDYqR)<br>swap-quote<br>/v1/swap/quote | Crypto | $0.005 |
| ![](https://www.paytoll.io/logos/ethereum.svg?dpl=dpl_BVr1i8dzfjKJwc9BUv7jVckmDYqR)<br>token-balance<br>/v1/crypto/token-balance | Crypto | $0.005 |
| ![](https://www.paytoll.io/logos/ethereum.svg?dpl=dpl_BVr1i8dzfjKJwc9BUv7jVckmDYqR)<br>trending-pools<br>/v1/crypto/onchain/trending-pools | Crypto | $0.015 |
| ![](https://www.paytoll.io/logos/ethereum.svg?dpl=dpl_BVr1i8dzfjKJwc9BUv7jVckmDYqR)<br>wallet-validator<br>/v1/crypto/validate | Crypto | $0.0005 |
| ![](https://www.paytoll.io/logos/anthropic.svg?dpl=dpl_BVr1i8dzfjKJwc9BUv7jVckmDYqR)<br>llm-anthropic<br>/v1/ai/anthropic/chat | AI | $0.01 |
| ![](https://www.paytoll.io/logos/google-gemini.svg?dpl=dpl_BVr1i8dzfjKJwc9BUv7jVckmDYqR)<br>llm-google<br>/v1/ai/google/chat | AI | $0.01 |
| ![](https://www.paytoll.io/logos/openai.svg?dpl=dpl_BVr1i8dzfjKJwc9BUv7jVckmDYqR)<br>llm-openai<br>/v1/ai/openai/chat | AI | $0.01 |
| ![](https://www.paytoll.io/logos/x.svg?dpl=dpl_BVr1i8dzfjKJwc9BUv7jVckmDYqR)<br>twitter-post<br>/v1/twitter/post | Social | $0.015 |
| ![](https://www.paytoll.io/logos/x.svg?dpl=dpl_BVr1i8dzfjKJwc9BUv7jVckmDYqR)<br>twitter-search<br>/v1/twitter/search | Social | $0.08 |
| ![](https://www.paytoll.io/logos/x.svg?dpl=dpl_BVr1i8dzfjKJwc9BUv7jVckmDYqR)<br>twitter-tweet-lookup<br>/v1/twitter/tweets | Social | $0.02 |
| ![](https://www.paytoll.io/logos/x.svg?dpl=dpl_BVr1i8dzfjKJwc9BUv7jVckmDYqR)<br>twitter-user-lookup<br>/v1/twitter/user | Social | $0.02 |
| ![](https://www.paytoll.io/logos/x.svg?dpl=dpl_BVr1i8dzfjKJwc9BUv7jVckmDYqR)<br>twitter-user-tweets<br>/v1/twitter/user-tweets | Social | $0.08 |

All prices in USD, paid in USDC on Base network.

[View full pricing details](https://www.paytoll.io/pricing)
</content>
</document>

---

<document>
<source>https://www.paytoll.io/pricing</source>
<title>Pricing - PayToll</title>
<content>
# Simple, Transparent Pricing

Pay only for what you use. No subscriptions, no monthly fees, no hidden charges.

## How Payment Works

Free-tier eligible endpoints can be used without payment up to the daily limit. When paid access is required, payments are made in USDC on Base via x402.

- Default free tier: 50 calls/day per IP
- Prices shown are in USD, paid in USDC
- Instant settlement on Base L2
- No minimum purchase required
- Non-custodial - we never hold your funds

## Crypto

### aave-best-borrow

POST

Find lowest Aave V3 borrow APR across all chains

`/v1/aave/best-borrow`

$0.01

### aave-best-yield

POST

Find best Aave V3 supply APY across all chains

`/v1/aave/best-yield`

$0.01

### aave-borrow

POST

Build an Aave V3 borrow transaction

`/v1/aave/borrow`

$0.01

### aave-health-factor

POST

Get health factor and liquidation risk for an Aave position

`/v1/aave/health-factor`

$0.005

### aave-markets

POST

Get overview of all Aave V3 markets with TVL and rates

`/v1/aave/markets`

$0.005

### aave-repay

POST

Build an Aave V3 repay transaction

`/v1/aave/repay`

$0.01

### aave-supply

POST

Build an Aave V3 supply (deposit) transaction

`/v1/aave/supply`

$0.01

### aave-user-positions

POST

Get all Aave V3 positions for a wallet address

`/v1/aave/user-positions`

$0.01

### aave-withdraw

POST

Build an Aave V3 withdraw transaction

`/v1/aave/withdraw`

$0.01

### crypto-price

POST

Get real-time crypto prices for any coin

`/v1/crypto/price`

$0.015

### ens-check

POST

Check ENS name availability and registration price

`/v1/ens/check`

Free

### ens-commit

POST

Build a commit transaction for ENS name registration (step 1 of 2)

`/v1/ens/commit`

Free

### ens-lookup

POST

Resolve ENS names to Ethereum addresses and perform reverse lookups

`/v1/crypto/ens`

$0.001

### ens-register

POST

Build a register transaction for ENS name registration (step 2 of 2)

`/v1/ens/register`

Free

### ens-renew

POST

Build a renewal transaction for an existing ENS name

`/v1/ens/renew`

Free

### onchain-token-data

POST

Get comprehensive on-chain token data (price, supply, FDV, market cap, top pools)

`/v1/crypto/onchain/token-data`

$0.015

### onchain-token-price

POST

Get on-chain token price by contract address and network (powered by GeckoTerminal)

`/v1/crypto/onchain/token-price`

$0.015

### search-pools

POST

Search liquidity pools by token name, symbol, or contract address across networks

`/v1/crypto/onchain/search-pools`

$0.015

### swap-build

POST

Build a DEX swap transaction for signing via Li.Fi

`/v1/swap/build`

$0.01

### swap-quote

POST

Get a DEX swap price quote across chains via Li.Fi

`/v1/swap/quote`

$0.005

### token-balance

POST

Check wallet token balance on any supported chain

`/v1/crypto/token-balance`

$0.005

### trending-pools

POST

Get trending liquidity pools on a network sorted by trading activity

`/v1/crypto/onchain/trending-pools`

$0.015

### wallet-validator

POST

Validate cryptocurrency wallet addresses with checksum verification

`/v1/crypto/validate`

$0.0005

## AI

### llm-anthropic

POST

Anthropic messages proxy — Claude 3/3.5 Haiku family

`/v1/ai/anthropic/chat`

$0.01

### llm-google

POST

Google Gemini proxy — Gemini 2.0 Flash and Flash Lite

`/v1/ai/google/chat`

$0.01

### llm-openai

POST

OpenAI chat completions proxy — GPT-4o mini and GPT-3.5 Turbo

`/v1/ai/openai/chat`

$0.01

## Social

### twitter-post

POST

Post a tweet using your OAuth access token

`/v1/twitter/post`

$0.015

### twitter-search

POST

Search recent tweets (last 7 days) on X/Twitter

`/v1/twitter/search`

$0.08

### twitter-tweet-lookup

POST

Look up tweets by ID with metrics and author info (max 10 per call)

`/v1/twitter/tweets`

$0.02

### twitter-user-lookup

POST

Look up X/Twitter user by username or user ID

`/v1/twitter/user`

$0.02

### twitter-user-tweets

POST

Get a user's recent tweets by user ID

`/v1/twitter/user-tweets`

$0.08

## Frequently Asked Questions

### What currency do I pay in?

All payments are made in USDC on the Base network. Prices are displayed in USD.

### Is there a minimum purchase?

No minimum. Pay exactly what each API call costs, starting from $0.0005.

### How do refunds work?

Payments are non-refundable but are only charged after successful API responses.

### Do you offer volume discounts?

Not currently, but we're exploring bulk pricing for high-volume users. Contact us if interested.
</content>
</document>

---

<document>
<source>https://www.paytoll.io/docs</source>
<title>API Documentation - PayToll</title>
<content>
# API Documentation

Complete reference for all PayToll API endpoints. Start with free-tier calls, then use x402 payment with USDC on Base when paid access is required.

## Getting Started

1. 1Make a request to a free-tier endpoint (for example`/v1/crypto/price`). You'll receive a normal response plus free-tier usage headers.
2. 2Free-tier defaults are 50 calls per IP per UTC day. Some expensive endpoints are paid immediately.
3. 3When paid access is required, you'll receive`402 Payment Required`. Retry with the`X-Payment`header containing the payment proof signed with your wallet.

## aave-best-borrow

1.0.0

Find lowest Aave V3 borrow APR across all chains

$0.01

POST`/v1/aave/best-borrow`

### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `asset`required | string | Asset symbol (e.g., USDC, ETH, WBTC, DAI) |
| `chainIds` | array | Optional: specific chain IDs to query |
| `minLiquidity` | number | Optional: minimum available liquidity in USD<br>Range: 0 \- ∞ |

### Example Request

Copy

```
curl -X POST https://api.paytoll.io/v1/aave/best-borrow \
  -H "Content-Type: application/json" \
  -H "X-Payment: <payment-proof>" \
  -d '{
  "asset": "example",
  "chainIds": [],
  "minLiquidity": 1
}'
```

## aave-best-yield

1.0.0

Find best Aave V3 supply APY across all chains

$0.01

POST`/v1/aave/best-yield`

### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `asset`required | string | Asset symbol (e.g., USDC, ETH, WBTC, DAI) |
| `chainIds` | array | Optional: specific chain IDs to query. Default: all major chains |
| `minLiquidity` | number | Optional: minimum available liquidity in USD to consider<br>Range: 0 \- ∞ |

### Example Request

Copy

```
curl -X POST https://api.paytoll.io/v1/aave/best-yield \
  -H "Content-Type: application/json" \
  -H "X-Payment: <payment-proof>" \
  -d '{
  "asset": "example",
  "chainIds": [],
  "minLiquidity": 1
}'
```

## aave-borrow

1.0.0

Build an Aave V3 borrow transaction

$0.01

POST`/v1/aave/borrow`

### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `userAddress`required | string | Wallet address that will sign the transaction |
| `tokenAddress`required | string | ERC20 token contract address to borrow |
| `amount`required | string | Amount to borrow (human-readable, e.g. "100.5") |
| `chainId`required | integerenum: 1 \| 137 \| 42161 \| 10 \| 8453 \| 43114 | Chain ID (1=Ethereum, 137=Polygon, 42161=Arbitrum, 10=Optimism, 8453=Base, 43114=Avalanche) |
| `marketAddress` | string | Optional: Aave pool address. Uses default if not provided. |

### Example Request

Copy

```
curl -X POST https://api.paytoll.io/v1/aave/borrow \
  -H "Content-Type: application/json" \
  -H "X-Payment: <payment-proof>" \
  -d '{
  "userAddress": "example",
  "tokenAddress": "example",
  "amount": "example",
  "chainId": 1,
  "marketAddress": "example"
}'
```

## aave-health-factor

1.0.0

Get health factor and liquidation risk for an Aave position

$0.005

POST`/v1/aave/health-factor`

### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `userAddress`required | string | Ethereum wallet address |
| `chainId`required | integerenum: 1 \| 137 \| 42161 \| 10 \| 8453 \| 43114 | Chain ID (1=Ethereum, 137=Polygon, 42161=Arbitrum, 10=Optimism, 8453=Base, 43114=Avalanche) |
| `marketAddress` | string | Optional: Aave pool address. Uses default if not provided. |

### Example Request

Copy

```
curl -X POST https://api.paytoll.io/v1/aave/health-factor \
  -H "Content-Type: application/json" \
  -H "X-Payment: <payment-proof>" \
  -d '{
  "userAddress": "example",
  "chainId": 1,
  "marketAddress": "example"
}'
```

## aave-markets

1.0.0

Get overview of all Aave V3 markets with TVL and rates

$0.005

POST`/v1/aave/markets`

### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `chainIds` | array | Optional: specific chain IDs. Default: all major chains. |
| `topAssetsCount` | integer | Number of top assets to include per market (default: 5)<br>Range: 1 \- 20 |

### Example Request

Copy

```
curl -X POST https://api.paytoll.io/v1/aave/markets \
  -H "Content-Type: application/json" \
  -H "X-Payment: <payment-proof>" \
  -d '{
  "chainIds": [],
  "topAssetsCount": 1
}'
```

## aave-repay

1.0.0

Build an Aave V3 repay transaction

$0.01

POST`/v1/aave/repay`

### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `userAddress`required | string | Wallet address that will sign the transaction |
| `tokenAddress`required | string | ERC20 token contract address to repay |
| `amount` | string | Amount to repay (human-readable). Required unless max is true. |
| `max` | boolean | If true, repay the entire debt position. Overrides amount. |
| `chainId`required | integerenum: 1 \| 137 \| 42161 \| 10 \| 8453 \| 43114 | Chain ID (1=Ethereum, 137=Polygon, 42161=Arbitrum, 10=Optimism, 8453=Base, 43114=Avalanche) |
| `marketAddress` | string | Optional: Aave pool address. Uses default if not provided. |

### Example Request

Copy

```
curl -X POST https://api.paytoll.io/v1/aave/repay \
  -H "Content-Type: application/json" \
  -H "X-Payment: <payment-proof>" \
  -d '{
  "userAddress": "example",
  "tokenAddress": "example",
  "amount": "example",
  "max": true,
  "chainId": 1,
  "marketAddress": "example"
}'
```

## aave-supply

1.0.0

Build an Aave V3 supply (deposit) transaction

$0.01

POST`/v1/aave/supply`

### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `userAddress`required | string | Wallet address that will sign the transaction |
| `tokenAddress`required | string | ERC20 token contract address to supply |
| `amount`required | string | Amount to supply (human-readable, e.g. "100.5") |
| `chainId`required | integerenum: 1 \| 137 \| 42161 \| 10 \| 8453 \| 43114 | Chain ID (1=Ethereum, 137=Polygon, 42161=Arbitrum, 10=Optimism, 8453=Base, 43114=Avalanche) |
| `marketAddress` | string | Optional: Aave pool address. Uses default if not provided. |

### Example Request

Copy

```
curl -X POST https://api.paytoll.io/v1/aave/supply \
  -H "Content-Type: application/json" \
  -H "X-Payment: <payment-proof>" \
  -d '{
  "userAddress": "example",
  "tokenAddress": "example",
  "amount": "example",
  "chainId": 1,
  "marketAddress": "example"
}'
```

## aave-user-positions

1.0.0

Get all Aave V3 positions for a wallet address

$0.01

POST`/v1/aave/user-positions`

### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `userAddress`required | string | Ethereum wallet address |
| `chainIds` | array | Optional: specific chain IDs to query |

### Example Request

Copy

```
curl -X POST https://api.paytoll.io/v1/aave/user-positions \
  -H "Content-Type: application/json" \
  -H "X-Payment: <payment-proof>" \
  -d '{
  "userAddress": "example",
  "chainIds": []
}'
```

## aave-withdraw

1.0.0

Build an Aave V3 withdraw transaction

$0.01

POST`/v1/aave/withdraw`

### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `userAddress`required | string | Wallet address that will sign the transaction |
| `tokenAddress`required | string | ERC20 token contract address to withdraw |
| `amount` | string | Amount to withdraw (human-readable). Required unless max is true. |
| `max` | boolean | If true, withdraw the entire supply position. Overrides amount. |
| `chainId`required | integerenum: 1 \| 137 \| 42161 \| 10 \| 8453 \| 43114 | Chain ID (1=Ethereum, 137=Polygon, 42161=Arbitrum, 10=Optimism, 8453=Base, 43114=Avalanche) |
| `marketAddress` | string | Optional: Aave pool address. Uses default if not provided. |

### Example Request

Copy

```
curl -X POST https://api.paytoll.io/v1/aave/withdraw \
  -H "Content-Type: application/json" \
  -H "X-Payment: <payment-proof>" \
  -d '{
  "userAddress": "example",
  "tokenAddress": "example",
  "amount": "example",
  "max": true,
  "chainId": 1,
  "marketAddress": "example"
}'
```

## crypto-price

2.0.0

Get real-time crypto prices for any coin

$0.015

POST`/v1/crypto/price`

### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `symbol`required | string | Crypto ticker (e.g., BTC, ETH) or CoinGecko ID (e.g., bitcoin, usd-coin). Any CoinGecko-listed coin is supported. |
| `currency` | stringenum: usd \| eur \| gbp \| jpy | Fiat currency for price<br>Default: `"usd"` |
| `includeMarketData` | boolean | Include 24h volume, market cap, etc.<br>Default: `false` |

### Example Request

Copy

```
curl -X POST https://api.paytoll.io/v1/crypto/price \
  -H "Content-Type: application/json" \
  -H "X-Payment: <payment-proof>" \
  -d '{
  "symbol": "ETH",
  "currency": "usd",
  "includeMarketData": false
}'
```

## ens-check

1.0.0

Check ENS name availability and registration price

Free

POST`/v1/ens/check`

### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `name`required | string | ENS name to check (without .eth suffix, e.g. "myname") |

### Example Request

Copy

```
curl -X POST https://api.paytoll.io/v1/ens/check \
  -H "Content-Type: application/json" \
  -H "X-Payment: <payment-proof>" \
  -d '{
  "name": "example"
}'
```

## ens-commit

1.0.0

Build a commit transaction for ENS name registration (step 1 of 2)

Free

POST`/v1/ens/commit`

### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `name`required | string | ENS name to register (without .eth suffix) |
| `userAddress`required | string | Ethereum address that will own the name |
| `duration` | integer | Registration duration in seconds (default: 31536000 = 1 year)<br>Range: 2419200 \- ∞ |
| `secret` | string | Optional 32-byte hex secret. Auto-generated if not provided. |
| `reverseRecord` | boolean | Set this name as the primary ENS name for the owner address (default: false) |

### Example Request

Copy

```
curl -X POST https://api.paytoll.io/v1/ens/commit \
  -H "Content-Type: application/json" \
  -H "X-Payment: <payment-proof>" \
  -d '{
  "name": "example",
  "userAddress": "example",
  "duration": 1,
  "secret": "example",
  "reverseRecord": true
}'
```

## ens-lookup

1.0.0

Resolve ENS names to Ethereum addresses and perform reverse lookups

$0.001

POST`/v1/crypto/ens`

### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `name` | string | ENS name (e.g., vitalik.eth) |
| `address` | string | Ethereum address for reverse lookup |
| `resolveAvatar` | boolean | Resolve avatar image<br>Default: `false` |
| `resolveText` | array | Text records to resolve |

### Example Request

Copy

```
curl -X POST https://api.paytoll.io/v1/crypto/ens \
  -H "Content-Type: application/json" \
  -H "X-Payment: <payment-proof>" \
  -d '{
  "name": "example",
  "address": "0x...",
  "resolveAvatar": false,
  "resolveText": []
}'
```

## ens-register

1.0.0

Build a register transaction for ENS name registration (step 2 of 2)

Free

POST`/v1/ens/register`

### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `name`required | string | ENS name to register (without .eth suffix) |
| `userAddress`required | string | Ethereum address that will own the name (must match commit step) |
| `duration` | integer | Registration duration in seconds (must match commit step, default: 31536000 = 1 year)<br>Range: 2419200 \- ∞ |
| `secret`required | string | The secret from the commit step |
| `reverseRecord` | boolean | Set this name as the primary ENS name for the owner address (default: false, must match commit step) |

### Example Request

Copy

```
curl -X POST https://api.paytoll.io/v1/ens/register \
  -H "Content-Type: application/json" \
  -H "X-Payment: <payment-proof>" \
  -d '{
  "name": "example",
  "userAddress": "example",
  "duration": 1,
  "secret": "example",
  "reverseRecord": true
}'
```

## ens-renew

1.0.0

Build a renewal transaction for an existing ENS name

Free

POST`/v1/ens/renew`

### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `name`required | string | ENS name to renew (without .eth suffix) |
| `duration` | integer | Renewal duration in seconds (default: 31536000 = 1 year)<br>Range: 2419200 \- ∞ |

### Example Request

Copy

```
curl -X POST https://api.paytoll.io/v1/ens/renew \
  -H "Content-Type: application/json" \
  -H "X-Payment: <payment-proof>" \
  -d '{
  "name": "example",
  "duration": 1
}'
```

## llm-anthropic

1.0.0

Anthropic messages proxy — Claude 3/3.5 Haiku family

$0.01

POST`/v1/ai/anthropic/chat`

### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `messages`required | array | Conversation messages |
| `model` | stringenum: claude-3-5-haiku-20241022 \| claude-3-haiku-20240307 | Model to use (default: claude-3-haiku-20240307)<br>Default: `"claude-3-haiku-20240307"` |
| `temperature` | number | Sampling temperature (0-2)<br>Default: `0.7`<br>Range: 0 \- 2 |
| `max_tokens` | integer | Maximum output tokens (1-4096)<br>Default: `1024`<br>Range: 1 \- 4096 |

### Example Request

Copy

```
curl -X POST https://api.paytoll.io/v1/ai/anthropic/chat \
  -H "Content-Type: application/json" \
  -H "X-Payment: <payment-proof>" \
  -d '{
  "messages": [],
  "model": "claude-3-haiku-20240307",
  "temperature": 0.7,
  "max_tokens": 1024
}'
```

## llm-google

1.0.0

Google Gemini proxy — Gemini 2.0 Flash and Flash Lite

$0.01

POST`/v1/ai/google/chat`

### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `messages`required | array | Conversation messages |
| `model` | stringenum: gemini-2.0-flash \| gemini-2.0-flash-lite | Model to use (default: gemini-2.0-flash-lite)<br>Default: `"gemini-2.0-flash-lite"` |
| `temperature` | number | Sampling temperature (0-2)<br>Default: `0.7`<br>Range: 0 \- 2 |
| `max_tokens` | integer | Maximum output tokens (1-4096)<br>Default: `1024`<br>Range: 1 \- 4096 |

### Example Request

Copy

```
curl -X POST https://api.paytoll.io/v1/ai/google/chat \
  -H "Content-Type: application/json" \
  -H "X-Payment: <payment-proof>" \
  -d '{
  "messages": [],
  "model": "gemini-2.0-flash-lite",
  "temperature": 0.7,
  "max_tokens": 1024
}'
```

## llm-openai

1.0.0

OpenAI chat completions proxy — GPT-4o mini and GPT-3.5 Turbo

$0.01

POST`/v1/ai/openai/chat`

### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `messages`required | array | Conversation messages |
| `model` | stringenum: gpt-4o-mini \| gpt-3.5-turbo | Model to use (default: gpt-4o-mini)<br>Default: `"gpt-4o-mini"` |
| `temperature` | number | Sampling temperature (0-2)<br>Default: `0.7`<br>Range: 0 \- 2 |
| `max_tokens` | integer | Maximum output tokens (1-4096)<br>Default: `1024`<br>Range: 1 \- 4096 |

### Example Request

Copy

```
curl -X POST https://api.paytoll.io/v1/ai/openai/chat \
  -H "Content-Type: application/json" \
  -H "X-Payment: <payment-proof>" \
  -d '{
  "messages": [],
  "model": "gpt-4o-mini",
  "temperature": 0.7,
  "max_tokens": 1024
}'
```

## onchain-token-data

1.0.0

Get comprehensive on-chain token data (price, supply, FDV, market cap, top pools)

$0.015

POST`/v1/crypto/onchain/token-data`

### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `network`required | stringenum: eth \| base \| polygon\_pos \| arbitrum \| optimism \| avalanche \| bsc \| solana \| fantom \| celo | Network ID (e.g., eth, base, polygon\_pos, arbitrum, solana) |
| `contractAddress`required | string | Token contract address on the specified network |

### Example Request

Copy

```
curl -X POST https://api.paytoll.io/v1/crypto/onchain/token-data \
  -H "Content-Type: application/json" \
  -H "X-Payment: <payment-proof>" \
  -d '{
  "network": "example",
  "contractAddress": "example"
}'
```

## onchain-token-price

1.0.0

Get on-chain token price by contract address and network (powered by GeckoTerminal)

$0.015

POST`/v1/crypto/onchain/token-price`

### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `network`required | stringenum: eth \| base \| polygon\_pos \| arbitrum \| optimism \| avalanche \| bsc \| solana \| fantom \| celo | Network ID (e.g., eth, base, polygon\_pos, arbitrum, solana) |
| `contractAddress`required | string | Token contract address on the specified network |

### Example Request

Copy

```
curl -X POST https://api.paytoll.io/v1/crypto/onchain/token-price \
  -H "Content-Type: application/json" \
  -H "X-Payment: <payment-proof>" \
  -d '{
  "network": "example",
  "contractAddress": "example"
}'
```

## search-pools

1.0.0

Search liquidity pools by token name, symbol, or contract address across networks

$0.015

POST`/v1/crypto/onchain/search-pools`

### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `query`required | string | Search query — token name, symbol, or contract address (e.g., "PEPE", "WETH", "0x...") |

### Example Request

Copy

```
curl -X POST https://api.paytoll.io/v1/crypto/onchain/search-pools \
  -H "Content-Type: application/json" \
  -H "X-Payment: <payment-proof>" \
  -d '{
  "query": "example"
}'
```

## swap-build

1.0.0

Build a DEX swap transaction for signing via Li.Fi

$0.01

POST`/v1/swap/build`

### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `userAddress`required | string | Wallet address that will sign the transaction |
| `fromChain`required | integer | Source chain ID (e.g. 1=Ethereum, 8453=Base, 42161=Arbitrum) |
| `toChain` | integer | Destination chain ID (defaults to fromChain for same-chain swap) |
| `fromToken`required | string | Source token address or symbol (e.g. "ETH", "USDC", or contract address) |
| `toToken`required | string | Destination token address or symbol |
| `amount`required | string | Amount to swap (human-readable, e.g. "1.5") |
| `slippage` | number | Slippage tolerance in percent (default 0.5%)<br>Range: 0.01 \- 50 |

### Example Request

Copy

```
curl -X POST https://api.paytoll.io/v1/swap/build \
  -H "Content-Type: application/json" \
  -H "X-Payment: <payment-proof>" \
  -d '{
  "userAddress": "example",
  "fromChain": 1,
  "toChain": 1,
  "fromToken": "example",
  "toToken": "example",
  "amount": "example",
  "slippage": 1
}'
```

## swap-quote

1.0.0

Get a DEX swap price quote across chains via Li.Fi

$0.005

POST`/v1/swap/quote`

### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `fromChain`required | integer | Source chain ID (e.g. 1=Ethereum, 8453=Base, 42161=Arbitrum) |
| `toChain` | integer | Destination chain ID (defaults to fromChain for same-chain swap) |
| `fromToken`required | string | Source token address or symbol (e.g. "ETH", "USDC", or contract address) |
| `toToken`required | string | Destination token address or symbol |
| `amount`required | string | Amount to swap in human-readable form (e.g. "1.5") |
| `slippage` | number | Slippage tolerance in percent (default 0.5%)<br>Range: 0.01 \- 50 |

### Example Request

Copy

```
curl -X POST https://api.paytoll.io/v1/swap/quote \
  -H "Content-Type: application/json" \
  -H "X-Payment: <payment-proof>" \
  -d '{
  "fromChain": 1,
  "toChain": 1,
  "fromToken": "example",
  "toToken": "example",
  "amount": "example",
  "slippage": 1
}'
```

## token-balance

1.0.0

Check wallet token balance on any supported chain

$0.005

POST`/v1/crypto/token-balance`

### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `userAddress`required | string | Wallet address to check |
| `chainId`required | integerenum: 1 \| 10 \| 56 \| 137 \| 8453 \| 42161 \| 43114 | Chain ID (1=Ethereum, 10=Optimism, 56=BSC, 137=Polygon, 8453=Base, 42161=Arbitrum, 43114=Avalanche) |
| `tokenAddress` | string | ERC20 token contract address. Omit for native token (ETH, MATIC, etc.). |

### Example Request

Copy

```
curl -X POST https://api.paytoll.io/v1/crypto/token-balance \
  -H "Content-Type: application/json" \
  -H "X-Payment: <payment-proof>" \
  -d '{
  "userAddress": "example",
  "chainId": 1,
  "tokenAddress": "example"
}'
```

## trending-pools

1.0.0

Get trending liquidity pools on a network sorted by trading activity

$0.015

POST`/v1/crypto/onchain/trending-pools`

### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `network`required | stringenum: eth \| base \| polygon\_pos \| arbitrum \| optimism \| avalanche \| bsc \| solana \| fantom \| celo | Network ID (e.g., eth, base, polygon\_pos, solana) |

### Example Request

Copy

```
curl -X POST https://api.paytoll.io/v1/crypto/onchain/trending-pools \
  -H "Content-Type: application/json" \
  -H "X-Payment: <payment-proof>" \
  -d '{
  "network": "example"
}'
```

## twitter-post

1.0.0

Post a tweet using your OAuth access token

$0.015

POST`/v1/twitter/post`

### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `text`required | string | Tweet text (max 280 characters) |
| `accessToken`required | string | Your OAuth 2.0 access token for X API (with tweet.write scope) |
| `replyToId` | string | Tweet ID to reply to (optional) |
| `quoteTweetId` | string | Tweet ID to quote (optional) |

### Example Request

Copy

```
curl -X POST https://api.paytoll.io/v1/twitter/post \
  -H "Content-Type: application/json" \
  -H "X-Payment: <payment-proof>" \
  -d '{
  "text": "example",
  "accessToken": "example",
  "replyToId": "example",
  "quoteTweetId": "example"
}'
```

## twitter-search

1.0.0

Search recent tweets (last 7 days) on X/Twitter

$0.08

POST`/v1/twitter/search`

### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `query`required | string | Search query (X API query syntax). Example: "bitcoin lang:en -is:retweet" |
| `maxResults` | integer | Number of results (10-20)<br>Default: `10`<br>Range: 10 \- 20 |
| `sortOrder` | stringenum: recency \| relevancy | Sort order for results<br>Default: `"recency"` |
| `nextToken` | string | Pagination token from a previous response |
| `tweetFields` | array | Tweet fields to return. Defaults to: id, text, author\_id, created\_at, public\_metrics |
| `includeAuthor` | boolean | Include author user objects in response<br>Default: `true` |

### Example Request

Copy

```
curl -X POST https://api.paytoll.io/v1/twitter/search \
  -H "Content-Type: application/json" \
  -H "X-Payment: <payment-proof>" \
  -d '{
  "query": "example",
  "maxResults": 10,
  "sortOrder": "recency",
  "nextToken": "example",
  "tweetFields": [],
  "includeAuthor": true
}'
```

## twitter-tweet-lookup

1.0.0

Look up tweets by ID with metrics and author info (max 10 per call)

$0.02

POST`/v1/twitter/tweets`

### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `ids`required | array | Tweet IDs to look up (1-10) |
| `tweetFields` | array | Tweet fields to return. Defaults to: id, text, author\_id, created\_at, public\_metrics |
| `includeAuthor` | boolean | Include author user objects in response<br>Default: `true` |

### Example Request

Copy

```
curl -X POST https://api.paytoll.io/v1/twitter/tweets \
  -H "Content-Type: application/json" \
  -H "X-Payment: <payment-proof>" \
  -d '{
  "ids": [],
  "tweetFields": [],
  "includeAuthor": true
}'
```

## twitter-user-lookup

1.0.0

Look up X/Twitter user by username or user ID

$0.02

POST`/v1/twitter/user`

### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `username` | string | Twitter username (without @). Provide username OR userId, not both. |
| `userId` | string | Twitter user ID. Provide username OR userId, not both. |
| `userFields` | array | User fields to return. Defaults to: id, name, username, description, public\_metrics, profile\_image\_url |

### Example Request

Copy

```
curl -X POST https://api.paytoll.io/v1/twitter/user \
  -H "Content-Type: application/json" \
  -H "X-Payment: <payment-proof>" \
  -d '{
  "username": "example",
  "userId": "example",
  "userFields": []
}'
```

## twitter-user-tweets

1.0.0

Get a user's recent tweets by user ID

$0.08

POST`/v1/twitter/user-tweets`

### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `userId`required | string | Twitter user ID |
| `maxResults` | integer | Number of tweets to return (5-20)<br>Default: `10`<br>Range: 5 \- 20 |
| `excludeReplies` | boolean | Exclude reply tweets<br>Default: `false` |
| `excludeRetweets` | boolean | Exclude retweets<br>Default: `false` |
| `nextToken` | string | Pagination token from a previous response |
| `tweetFields` | array | Tweet fields to return. Defaults to: id, text, author\_id, created\_at, public\_metrics |

### Example Request

Copy

```
curl -X POST https://api.paytoll.io/v1/twitter/user-tweets \
  -H "Content-Type: application/json" \
  -H "X-Payment: <payment-proof>" \
  -d '{
  "userId": "example",
  "maxResults": 10,
  "excludeReplies": false,
  "excludeRetweets": false,
  "nextToken": "example",
  "tweetFields": []
}'
```

## wallet-validator

1.0.0

Validate cryptocurrency wallet addresses with checksum verification

$0.0005

POST`/v1/crypto/validate`

### Parameters

| Name | Type | Description |
| --- | --- | --- |
| `address`required | string | Wallet address to validate |
| `network` | stringenum: ethereum \| bitcoin \| solana \| auto | Network type (auto-detect if not specified)<br>Default: `"auto"` |
| `strict` | boolean | Enforce checksum validation<br>Default: `true` |

### Example Request

Copy

```
curl -X POST https://api.paytoll.io/v1/crypto/validate \
  -H "Content-Type: application/json" \
  -H "X-Payment: <payment-proof>" \
  -d '{
  "address": "0x...",
  "network": "auto",
  "strict": true
}'
```
</content>
</document>

---

